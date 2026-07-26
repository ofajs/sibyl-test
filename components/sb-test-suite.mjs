const templatePromise = (async () => {
  const baseUrl = import.meta.url;
  const templateUrl = new URL("./sb-test-suite-template.html", baseUrl).href;
  const response = await fetch(templateUrl);
  return response.text();
})();

export default class SbTestSuite extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.totalTests = 0;
    this.expectedTotal = 0;
    this.successTests = 0;
    this.errorTests = 0;
    this.iframes = new Map();
    this.expandedGroups = new Set();
    this.pendingUrls = [];
    this.runningUrls = new Set();
    // 并发度：同时最多运行的 iframe 数量，由 parallel 属性控制（默认 1，保持原串行行为）
    this.parallel = 1;
    // 兼容字段：指向最近启动的 url，外部进度报告仍可读取
    this.currentUrl = null;
    this.templateReady = false;
    this.preFetchCounts = new Map();

    this.handleMessage = this.handleMessage.bind(this);
    this.toggleGroup = this.toggleGroup.bind(this);
  }

  async preFetchTestCounts(urls) {
    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const sbTests = doc.querySelectorAll("sb-test");
        const count = sbTests.length;
        this.preFetchCounts.set(url, count);
        return count;
      } catch (e) {
        this.preFetchCounts.set(url, 0);
        return 0;
      }
    });
    
    const counts = await Promise.all(promises);
    this.expectedTotal = counts.reduce((sum, c) => sum + c, 0);
    this.totalTests = this.expectedTotal;
  }

  async connectedCallback() {
    window.addEventListener("message", this.handleMessage);

    // 读取并发度配置：<sb-test-suite parallel="2">
    const parallelAttr = this.getAttribute("parallel");
    const parsed = parseInt(parallelAttr, 10);
    this.parallel = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    const includes = this.querySelectorAll("include");
    this.pendingUrls = Array.from(includes)
      .map((inc) => inc.getAttribute("src"))
      .filter(Boolean)
      .map((url) => new URL(url, window.location.href).toString());

    this.templateHtml = await templatePromise;
    this.templateReady = true;

    this.render();
    
    await this.preFetchTestCounts(this.pendingUrls.slice());
    
    this.render();
    this.startNext();
  }

  // 按并发度启动 iframe：只要还有待跑 url 且运行中的数量小于并发度，就继续启动
  startNext() {
    while (
      this.pendingUrls.length > 0 &&
      this.runningUrls.size < this.parallel
    ) {
      const absoluteUrl = this.pendingUrls.shift();
      this.runningUrls.add(absoluteUrl);
      this.currentUrl = absoluteUrl;

      const iframe = document.createElement("iframe");
      iframe.src = absoluteUrl;
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.position = "absolute";
      iframe.style.visibility = "hidden";
      this.shadowRoot.appendChild(iframe);

      const preFetchedTotal = this.preFetchCounts.get(absoluteUrl) || 0;
      this.iframes.set(absoluteUrl, {
        iframe,
        total: preFetchedTotal,
        success: 0,
        error: 0,
        results: [],
      });
    }

    this.render();
  }

  // 检查某个 iframe 是否已收集到全部结果，若完成则清理并补充下一个
  checkIframeComplete(url) {
    const iframeData = this.iframes.get(url);
    if (!iframeData) return;
    if (!this.runningUrls.has(url)) return; // 已被清理过，避免重复触发

    if (iframeData.results.length === iframeData.total) {
      this.removeIframe(url);
      this.runningUrls.delete(url);
      this.startNext();
    }
  }

  disconnectedCallback() {
    window.removeEventListener("message", this.handleMessage);
  }

  removeIframe(url) {
    const iframeData = this.iframes.get(url);
    if (iframeData && iframeData.iframe) {
      const iframe = iframeData.iframe;
      // 先从 DOM 移除，再用空 srcdoc 清空内部页面，避免 about:blank 触发 DevTools 注入报错
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe.srcdoc = "";
      iframe.src = "";
      iframeData.iframe = null;
    }
  }

  handleMessage(event) {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "sb-test-count") {
      const url = data.url;
      const iframeData = this.iframes.get(url);
      if (iframeData) {
        if (iframeData.total !== data.count) {
          const diff = data.count - iframeData.total;
          this.totalTests += diff;
          iframeData.total = data.count;
        }
        this.render();
        this.checkIframeComplete(url);
      }
    } else if (data.type === "sb-test-result") {
      const url = data.url;
      const iframeData = this.iframes.get(url);
      if (iframeData) {
        if (data.success) {
          iframeData.success++;
        } else {
          iframeData.error++;
        }
        iframeData.results.push(data);
        this.updateCounts();
        this.checkIframeComplete(url);
      }
    }
  }

  toggleGroup(url) {
    if (this.expandedGroups.has(url)) {
      this.expandedGroups.delete(url);
    } else {
      this.expandedGroups.add(url);
    }
    this.render();
  }

  updateCounts() {
    this.successTests = Array.from(this.iframes.values()).reduce(
      (sum, data) => sum + data.success,
      0,
    );
    this.errorTests = Array.from(this.iframes.values()).reduce(
      (sum, data) => sum + data.error,
      0,
    );
    this.render();
  }

  render() {
    if (!this.templateReady) return;

    const isFinished =
      this.pendingUrls.length === 0 &&
      (this.totalTests === 0 || this.successTests + this.errorTests === this.totalTests);
    const isSuccess = isFinished && this.errorTests === 0;
    const isFailure = this.errorTests > 0;

    if (isFailure) {
      this.setAttribute("failure", "");
      this.removeAttribute("success");
    } else if (isSuccess) {
      this.setAttribute("success", "");
      this.removeAttribute("failure");
    } else {
      this.removeAttribute("success");
      this.removeAttribute("failure");
    }

    const details = this.renderDetails();

    let statusText = "Running";
    let statusClass = "running";
    if (isFinished) {
      if (isSuccess) {
        statusText = "Passed";
        statusClass = "passed";
      } else {
        statusText = "Failed";
        statusClass = "failed";
      }
    }

    let html = this.templateHtml
      .replace("{{totalTests}}", this.totalTests)
      .replace("{{totalTestsDisplay}}", this.totalTests)
      .replace("{{successTests}}", this.successTests)
      .replace("{{errorTests}}", this.errorTests)
      .replace("{{details}}", details)
      .replace("{{statusText}}", statusText)
      .replace("{{statusClass}}", statusClass);

    let container = this.shadowRoot.querySelector(".ui-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "ui-container";

      container.addEventListener("click", (e) => {
        const openBtn = e.target.closest(".open-btn");
        if (openBtn) {
          const url = openBtn.getAttribute("data-open-url");
          if (url) {
            window.open(url, "_blank");
          }
          return;
        }

        const titleEl = e.target.closest(".iframe-title");
        if (titleEl) {
          const groupEl = titleEl.closest(".iframe-group");
          if (groupEl) {
            const url = groupEl.getAttribute("data-url");
            if (url) {
              this.toggleGroup(url);
            }
          }
        }
      });

      this.shadowRoot.appendChild(container);
    }
    container.innerHTML = html;
  }

  renderDetails() {
    return Array.from(this.iframes.entries())
      .map(([url, data]) => {
        const isExpanded = this.expandedGroups.has(url);
        const expandClass = isExpanded ? "expanded" : "";

        const isFinished = data.results.length === data.total;
        let statusClass = "";
        if (isFinished) {
          statusClass = data.error > 0 ? "failure" : "success";
        } else if (data.error > 0) {
          statusClass = "failure";
        } else if (this.runningUrls.has(url)) {
          statusClass = "running";
        }

        const displayTotal = data.total;

        let groupHtml = `<div class="iframe-group" data-url="${url}">
        <div class="iframe-title ${expandClass} ${statusClass}">
          <span class="toggle-icon">▶</span>
          <span>${new URL(url).pathname} - Total: ${displayTotal}, Success: ${data.success}, Error: ${data.error}</span>
          <span class="open-btn" data-open-url="${url}">Open</span>
        </div>
        <div class="iframe-content ${expandClass}">`;

        data.results.forEach((r) => {
          const statusIcon = r.success ? "✓" : "✗";
          groupHtml += `
          <div class="result-item ${r.success ? "success" : "failure"}">
            <div class="result-name">${statusIcon} ${this.escapeHtml(r.name)}</div>`;

          if (!r.success) {
            if (r.result && typeof r.result === "object" && r.result.message) {
              let msg = `Error: ${this.escapeHtml(r.result.message)}`;
              if (r.result.content != null) {
                msg += `\nContent: ${this.escapeHtml(r.result.content)}`;
              }
              groupHtml += `<div class="error-msg">${msg}</div>`;
              if (r.result.stack) {
                groupHtml += `<div class="error-stack">${this.escapeHtml(r.result.stack)}</div>`;
              }
            } else {
              let msg = `Assertion failed: expected true but got ${this.escapeHtml(JSON.stringify(r.result && r.result.assert))}`;
              if (r.result && r.result.content != null) {
                msg += `\nContent: ${this.escapeHtml(r.result.content)}`;
              }
              groupHtml += `<div class="error-msg">${msg}</div>`;
            }
            if (r.result && r.result.content != null) {
              groupHtml += `<div class="result-content">${this.escapeHtml(r.result.content)}</div>`;
            }
          } else {
            if (r.result && r.result.content) {
              groupHtml += `<div class="result-content">${this.escapeHtml(JSON.stringify(r.result.content, null, 2))}</div>`;
            }
          }

          groupHtml += `</div>`;
        });

        groupHtml += `</div></div>`;
        return groupHtml;
      })
      .join("");
  }

  escapeHtml(text) {
    if (text == null) return "";
    const str = typeof text === "object" ? JSON.stringify(text, null, 2) : String(text);
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define("sb-test-suite", SbTestSuite);
