import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function generateAllHtml(files, outputPath, rootDir, parallel = 1) {
  const includeTags = files
    .map((file) => `      <include src="./${file}"></include>`)
    .sort()
    .join("\n");

  // parallel > 1 时写入并发属性，让 sb-test-suite 同时跑多个 iframe
  const suiteAttr = parallel > 1 ? ` parallel="${parallel}"` : "";

  const html = `<!doctype html>
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

  fs.writeFileSync(outputPath, html, "utf-8");
}

export function generateTestHtml(rootDir, options = {}) {
  const { parallel = 1 } = options;
  const sbHtmlFiles = findSbHtmlFiles(rootDir, rootDir);
  const outputFilePath = path.join(rootDir, "test-all.html");

  generateAllHtml(sbHtmlFiles, outputFilePath, rootDir, parallel);

  console.log(`Found ${sbHtmlFiles.length} .sb.html files`);
  console.log(`Generated: ${outputFilePath}`);
  if (parallel > 1) {
    console.log(`Parallel: ${parallel} (iframes run concurrently)`);
  }
  
  return {
    fileCount: sbHtmlFiles.length,
    outputPath: outputFilePath
  };
}

export function generateFilesHtml(rootDir, filePaths, options = {}) {
  const { parallel = 1 } = options;
  const files = Array.isArray(filePaths) ? filePaths : [filePaths];
  const outputFilePath = path.join(rootDir, "test-all.html");

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

  generateAllHtml(relativePaths, outputFilePath, rootDir, parallel);

  console.log(`Generated test file(s): ${relativePaths.join(", ")}`);
  console.log(`Generated: ${outputFilePath}`);
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
