import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 常驻测试清单：首次自动生成，之后每次运行做“查漏补缺”式同步；
// 清单内的顺序、skip/exclusive 等手动编辑都会被保留
export const MANIFEST_NAME = "test-index.html";
// 旧版清单名，用于升级迁移
export const LEGACY_MANIFEST_NAME = "test-all.html";
// -f 指定文件时的临时清单，用完即删，不触碰常驻清单
export const TEMP_MANIFEST_NAME = "test-run.html";

const includeTagRe = () => /<include\b[^>]*>(?:\s*<\/include>)?/gi;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function findSbHtmlFiles(dir, baseDir) {
  const results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git") {
        results.push(...findSbHtmlFiles(fullPath, baseDir));
      }
    } else if (file.endsWith(".sb.html")) {
      const relativePath = path.relative(baseDir, fullPath);
      results.push(relativePath);
    }
  }

  return results;
}

function extractIncludeSrc(tag) {
  const m = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

// 查漏补缺式同步：
// 1. 清单里指向已删除文件的 <include> 行被移除
// 2. 磁盘上新出现的 .sb.html 追加到 include 列表末尾（不打乱手动排序）
// 3. 其余内容（顺序、skip/exclusive/注释等）逐字节保留
function reconcileManifest(content, rootDir, scannedRelPaths) {
  const lines = content.split("\n");
  const outLines = [];
  const keptAbs = new Set();
  const removed = [];
  let lastIncludeLineIdx = -1;

  for (const line of lines) {
    const tags = [...line.matchAll(includeTagRe())];

    if (tags.length === 0) {
      outLines.push(line);
      continue;
    }

    let newLine = line;
    let keptAny = false;
    for (const tag of tags) {
      const src = extractIncludeSrc(tag[0]);
      const abs = src ? path.resolve(rootDir, src) : null;
      if (abs && fs.existsSync(abs)) {
        keptAbs.add(abs);
        keptAny = true;
      } else {
        newLine = newLine.replace(tag[0], "");
        removed.push(src || "(no src)");
      }
    }

    // 整行只剩失效的 include 时连缩进行一起删掉
    if (!keptAny && newLine.trim() === "") {
      continue;
    }
    if (keptAny) {
      lastIncludeLineIdx = outLines.length;
    }
    outLines.push(newLine);
  }

  const added = scannedRelPaths
    .filter((rel) => !keptAbs.has(path.resolve(rootDir, rel)))
    .sort();

  if (added.length > 0) {
    const insertTags = added.map(
      (rel) => `<include src="./${toPosix(rel)}"></include>`,
    );

    let indent = "      ";
    if (lastIncludeLineIdx >= 0) {
      indent = outLines[lastIncludeLineIdx].match(/^\s*/)[0] || indent;
    }
    const insertLines = insertTags.map((t) => `${indent}${t}`);

    if (lastIncludeLineIdx >= 0) {
      outLines.splice(lastIncludeLineIdx + 1, 0, ...insertLines);
    } else {
      const closeIdx = outLines.findIndex((l) =>
        l.includes("</sb-test-suite>"),
      );
      if (closeIdx >= 0) {
        outLines.splice(closeIdx, 0, ...insertLines);
      } else {
        outLines.push(...insertLines);
      }
    }
  }

  return { content: outLines.join("\n"), added, removed };
}

function buildFreshHtml(files, parallel) {
  const includeTags = files
    .map((file) => `      <include src="./${toPosix(file)}"></include>`)
    .sort()
    .join("\n");

  // parallel > 1 时写入并发属性，让 sb-test-suite 同时跑多个 iframe
  const suiteAttr = parallel > 1 ? ` parallel="${parallel}"` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>All Tests</title>
    <script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test-suite.mjs"></script>
  </head>
  <body>
    <sb-test-suite${suiteAttr}>
${includeTags}
    </sb-test-suite>
  </body>
</html>
`;
}

// 仅在显式传入 -c 时调用：把并发数写到 suite 的 parallel 属性上，避免覆盖手动配置
function applyParallelAttr(html, parallel) {
  const openTag = html.match(/<sb-test-suite\b[^>]*>/i);
  if (!openTag) return html;

  let tag = openTag[0];
  if (/\bparallel\s*=/i.test(tag)) {
    tag = tag.replace(
      /\bparallel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i,
      `parallel="${parallel}"`,
    );
  } else {
    tag = tag.replace(/>$/, ` parallel="${parallel}">`);
  }

  return html.slice(0, openTag.index) + tag + html.slice(openTag.index + openTag[0].length);
}

export function generateTestHtml(rootDir, options = {}) {
  const { parallel = 1, parallelExplicit = false, force = false } = options;
  const sbHtmlFiles = findSbHtmlFiles(rootDir, rootDir);
  const outputFilePath = path.join(rootDir, MANIFEST_NAME);

  // 已有清单 → 增量同步；旧版清单 → 迁移后同步；都没有 → 全新生成
  let baseContent = null;
  if (!force && fs.existsSync(outputFilePath)) {
    baseContent = fs.readFileSync(outputFilePath, "utf-8");
  } else if (!force && fs.existsSync(path.join(rootDir, LEGACY_MANIFEST_NAME))) {
    baseContent = fs.readFileSync(path.join(rootDir, LEGACY_MANIFEST_NAME), "utf-8");
    console.log(
      `Migrating legacy ${LEGACY_MANIFEST_NAME} to ${MANIFEST_NAME} (old file kept)`,
    );
  }

  if (baseContent !== null) {
    const result = reconcileManifest(baseContent, rootDir, sbHtmlFiles);
    let html = result.content;
    if (parallelExplicit) {
      html = applyParallelAttr(html, parallel);
    }
    fs.writeFileSync(outputFilePath, html, "utf-8");

    console.log(`Synced test manifest: ${outputFilePath}`);
    console.log(`Found ${sbHtmlFiles.length} .sb.html files`);
    if (result.added.length > 0) {
      console.log(`  + Added: ${result.added.join(", ")}`);
    }
    if (result.removed.length > 0) {
      console.log(`  - Removed: ${result.removed.join(", ")}`);
    }
    if (result.added.length === 0 && result.removed.length === 0) {
      console.log("  Up to date");
    }
    if (parallelExplicit) {
      console.log(`Parallel: ${parallel}`);
    }

    return {
      fileCount: sbHtmlFiles.length,
      outputPath: outputFilePath,
      added: result.added,
      removed: result.removed,
    };
  }

  fs.writeFileSync(outputFilePath, buildFreshHtml(sbHtmlFiles, parallel), "utf-8");

  console.log(`Found ${sbHtmlFiles.length} .sb.html files`);
  console.log(`Generated: ${outputFilePath}`);
  if (parallel > 1) {
    console.log(`Parallel: ${parallel} (iframes run concurrently)`);
  }

  return {
    fileCount: sbHtmlFiles.length,
    outputPath: outputFilePath,
    added: [],
    removed: [],
  };
}

export function generateFilesHtml(rootDir, filePaths, options = {}) {
  const { parallel = 1 } = options;
  const files = Array.isArray(filePaths) ? filePaths : [filePaths];
  const outputFilePath = path.join(rootDir, TEMP_MANIFEST_NAME);

  const relativePaths = [];
  for (const filePath of files) {
    const resolvedPath = path.resolve(rootDir, filePath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`File not found: ${resolvedPath}`);
      return {
        fileCount: 0,
        outputPath: outputFilePath
      };
    }

    // 显式指定的文件只要求 .html 后缀（默认扫描仍只收集 .sb.html）
    if (!resolvedPath.endsWith(".html")) {
      console.error(`Not an .html file: ${filePath}`);
      return {
        fileCount: 0,
        outputPath: outputFilePath
      };
    }

    const relativePath = path.relative(rootDir, resolvedPath);
    if (!relativePaths.includes(relativePath)) {
      relativePaths.push(relativePath);
    }
  }

  // 写入临时清单，常驻的 test-index.html 不受影响
  fs.writeFileSync(outputFilePath, buildFreshHtml(relativePaths, parallel), "utf-8");

  console.log(`Generated test file(s): ${relativePaths.join(", ")}`);
  console.log(`Generated: ${outputFilePath} (${MANIFEST_NAME} untouched)`);
  if (parallel > 1) {
    console.log(`Parallel: ${parallel} (iframes run concurrently)`);
  }

  return {
    fileCount: relativePaths.length,
    outputPath: outputFilePath
  };
}

// 向后兼容：单文件用法保持原函数签名
export function generateSingleTestHtml(rootDir, filePath, options = {}) {
  return generateFilesHtml(rootDir, filePath, options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = process.cwd();
  generateTestHtml(rootDir);
}
