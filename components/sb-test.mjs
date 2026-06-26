export default class SbTest extends HTMLElement {
  static templatePromise = null;
  static testQueue = [];
  static isRunning = false;
  static summaryData = { success: 0, fail: 0 };
  static summaryEl = null;

  static initSummary() {
    const total = document.querySelectorAll("sb-test").length;
    if (total === 0) return;

    const h1 = document.querySelector("h1");
    if (!h1) return;

    h1.style.display = "flex";
    h1.style.justifyContent = "space-between";
    h1.style.alignItems = "center";

    SbTest.summaryEl = document.createElement("span");
    SbTest.summaryEl.style.cssText =
      "font-size: 0.65em; font-weight: normal; opacity: 0.7;";
    h1.appendChild(SbTest.summaryEl);
    SbTest.updateSummaryDisplay(total);
  }

  static updateSummaryDisplay(total) {
    if (!SbTest.summaryEl) return;
    const { success, fail } = SbTest.summaryData;
    const totalCount = total || document.querySelectorAll("sb-test").length;
    SbTest.summaryEl.textContent = `✓ ${success} | ✗ ${fail} | 总计 ${totalCount}`;
  }

  static recordResult(success) {
    if (success) {
      SbTest.summaryData.success++;
    } else {
      SbTest.summaryData.fail++;
    }
    SbTest.updateSummaryDisplay();
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static loadTemplate() {
    if (SbTest.templatePromise) {
      return SbTest.templatePromise;
    }

    SbTest.templatePromise = (async () => {
      try {
        const templateUrl = import.meta.resolve("./sb-test-template.html");

        const response = await fetch(templateUrl);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        return {
          styles: doc.querySelector("#sb-test-styles"),
          result: doc.querySelector("#sb-test-result"),
          error: doc.querySelector("#sb-test-error"),
        };
      } catch (err) {
        console.error("Failed to load template:", err);
        return null;
      }
    })();

    return SbTest.templatePromise;
  }

  async connectedCallback() {
    const templates = await SbTest.loadTemplate();
    const isParallel = this.hasAttribute("parallel");

    const executeTest = () => {
      SbTest.testCounter = (SbTest.testCounter || 0) + 1;
      const baseName = this.getAttribute("name") || "Unnamed Test";
      const name = `${SbTest.testCounter}. ${baseName}`;
      const template = this.querySelector("template");

      if (!template) {
        this.showError(name, "No template found", templates);
        return;
      }

      const script = template.content.querySelector("script");

      if (!script) {
        this.showError(name, "No script found in template", templates);
        return;
      }

      const code = script.textContent;
      return this.runTest(name, code, templates);
    };

    if (isParallel) {
      requestAnimationFrame(executeTest);
    } else {
      SbTest.testQueue.push({
        element: this,
        execute: executeTest,
      });

      requestAnimationFrame(() => {
        if (!SbTest.isRunning) {
          SbTest.processQueue();
        }
      });
    }
  }

  static async processQueue() {
    if (SbTest.testQueue.length === 0) {
      SbTest.isRunning = false;
      return;
    }

    SbTest.isRunning = true;
    const { execute } = SbTest.testQueue.shift();

    try {
      await execute();
    } catch (error) {
      console.error("Test execution error:", error);
    }

    SbTest.processQueue();
  }

  resolveImportPaths(code, baseUrl) {
    let result = code;

    const resolvePath = (importPath) => {
      try {
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          return new URL(importPath, baseUrl).href;
        } else if (importPath.startsWith("/")) {
          return new URL(importPath, window.location.origin).href;
        }
      } catch (e) {
        console.warn("Failed to resolve import path:", importPath, e);
      }
      return importPath;
    };

    result = result.replace(
      /^\s*import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+(['"`])([^'"`]+)\3\s*;?\s*$/gm,
      (match, defaultImport, namedImports, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        const trimmedNamed = namedImports.trim();
        return `const { default: ${defaultImport}, ${trimmedNamed} } = await import(${quote}${resolvedPath}${quote});`;
      }
    );

    result = result.replace(
      /^\s*import\s+(\w+)\s+from\s+(['"`])([^'"`]+)\2\s*;?\s*$/gm,
      (match, defaultImport, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        return `const { default: ${defaultImport} } = await import(${quote}${resolvedPath}${quote});`;
      }
    );

    result = result.replace(
      /^\s*import\s*\{([^}]+)\}\s+from\s+(['"`])([^'"`]+)\2\s*;?\s*$/gm,
      (match, namedImports, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        const trimmedNamed = namedImports.trim();
        return `const { ${trimmedNamed} } = await import(${quote}${resolvedPath}${quote});`;
      }
    );

    result = result.replace(
      /^\s*import\s+\*\s+as\s+(\w+)\s+from\s+(['"`])([^'"`]+)\2\s*;?\s*$/gm,
      (match, namespaceImport, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        return `const ${namespaceImport} = await import(${quote}${resolvedPath}${quote});`;
      }
    );

    result = result.replace(
      /import\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      (match, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        return `import(${quote}${resolvedPath}${quote})`;
      }
    );

    result = result.replace(
      /import\.meta\.resolve\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
      (match, quote, importPath) => {
        const resolvedPath = resolvePath(importPath);
        return `"${resolvedPath}"`;
      }
    );

    return result;
  }

  async runTest(name, code, templates) {
    let url = "";
    let sourceURL = window.location.href;
    try {
      let lineOffset = 0;
      let htmlContent = "";
      try {
        htmlContent = await fetch(window.location.href).then((r) => r.text());
        const codeIndex = htmlContent.indexOf(code);
        if (codeIndex !== -1) {
          lineOffset =
            htmlContent.substring(0, codeIndex).split("\n").length - 1;
        }
      } catch (e) {
        console.warn("Failed to fetch source for padding", e);
      }

      try {
        const urlObj = new URL(sourceURL);
        urlObj.searchParams.set("test", name.replace(/\s+/g, "-"));
        sourceURL = urlObj.toString();
      } catch (e) {
      }

      const resolvedCode = this.resolveImportPaths(code, window.location.href);

      let blobContent = "";
      if (htmlContent && lineOffset > 0) {
        const lines = htmlContent.split("\n");

        lines[0] = `export default async function test() { // ${lines[0]}`;

        const beforeCode = lines
          .slice(0, lineOffset)
          .map((line, i) => (i === 0 ? line : `// ${line}`))
          .join("\n");
        const codeLineCount = code.split("\n").length;
        const afterCode = lines
          .slice(lineOffset + codeLineCount)
          .map((line) => `// ${line}`)
          .join("\n");

        blobContent = `${beforeCode}\n${resolvedCode}\n${afterCode}\n}\n//# sourceURL=${sourceURL}`;
      } else {
        const padLines = "\n".repeat(Math.max(0, lineOffset));
        blobContent = `export default async function test() {${padLines}${resolvedCode}\n}\n//# sourceURL=${sourceURL}`;
      }

      const blob = new Blob([blobContent], { type: "application/javascript" });
      url = URL.createObjectURL(blob);

      const module = await import(url);
      const result = await module.default();

      const success = result && result.assert === true;
      this.showResult(name, result, success, templates);
      this.notifyParent(name, result, success);
      SbTest.recordResult(success);
    } catch (error) {
      if (error instanceof Error && error.stack && url) {
        error.stack = error.stack.split(url).join(sourceURL);
      }
      this.showError(name, error, templates);
      this.notifyParent(
        name,
        {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : "",
        },
        false,
      );
      SbTest.recordResult(false);
    }
  }

  notifyParent(name, result, success) {
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "sb-test-result",
          name,
          result,
          success,
          url: window.location.href,
        },
        "*",
      );
    }
  }

  showResult(name, result, success, templates) {
    const status = success ? "✓" : "✗";
    const attr = success ? "success" : "failure";

    this.setAttribute(attr, "");

    if (!templates || !templates.styles || !templates.result) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; padding: 12px; margin: 8px 0; }
          :host([success]) { background: #d4edda; border-left: 4px solid #28a745; }
          :host([failure]) { background: #f8d7da; border-left: 4px solid #dc3545; }
        </style>
        <div>${status} ${this.escapeHtml(name)}</div>
      `;
      return;
    }

    const stylesTemplate = templates.styles.content.cloneNode(true);
    const resultTemplate = templates.result.content.cloneNode(true);

    const statusEl = resultTemplate.querySelector(".status");
    const nameEl = resultTemplate.querySelector(".name");
    const errorMsgEl = resultTemplate.querySelector(".error-msg");
    const contentEl = resultTemplate.querySelector(".content");

    statusEl.textContent = status;
    nameEl.textContent = name;

    if (!success) {
      let msg = `Assertion failed: expected true but got ${result && result.assert}`;
      if (result && result.content != null) {
        msg += `\nContent: ${typeof result.content === "object" ? JSON.stringify(result.content, null, 2) : String(result.content)}`;
      }
      errorMsgEl.textContent = msg;
    } else {
      errorMsgEl.remove();
    }

    if (result && result.content != null) {
      contentEl.textContent = typeof result.content === "object" ? JSON.stringify(result.content, null, 2) : String(result.content);
    } else {
      contentEl.remove();
    }

    this.shadowRoot.appendChild(stylesTemplate);
    this.shadowRoot.appendChild(resultTemplate);
  }

  showError(name, error, templates) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";

    this.setAttribute("failure", "");

    if (!templates || !templates.styles || !templates.error) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; padding: 12px; margin: 8px 0; background: #f8d7da; border-left: 4px solid #dc3545; }
        </style>
        <div>✗ ${this.escapeHtml(name)}</div>
        <div>Error: ${this.escapeHtml(errorMsg)}</div>
      `;
      return;
    }

    const stylesTemplate = templates.styles.content.cloneNode(true);
    const errorTemplate = templates.error.content.cloneNode(true);

    const nameEl = errorTemplate.querySelector(".name");
    const errorMsgEl = errorTemplate.querySelector(".error-msg");
    const errorStackEl = errorTemplate.querySelector(".error-stack");

    nameEl.textContent = name;
    errorMsgEl.textContent = `Error: ${errorMsg}`;

    if (errorStack) {
      errorStackEl.textContent = errorStack;
    } else {
      errorStackEl.remove();
    }

    this.shadowRoot.appendChild(stylesTemplate);
    this.shadowRoot.appendChild(errorTemplate);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define("sb-test", SbTest);

setTimeout(() => SbTest.initSummary(), 0);

if (window.parent !== window) {
  setTimeout(() => {
    const tests = document.querySelectorAll("sb-test");
    window.parent.postMessage(
      {
        type: "sb-test-count",
        count: tests.length,
        url: window.location.href,
      },
      "*",
    );
  }, 100);
}
