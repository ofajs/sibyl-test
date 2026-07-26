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

export function generateSingleTestHtml(rootDir, filePath, options = {}) {
  const { parallel = 1 } = options;
  const resolvedPath = path.resolve(rootDir, filePath);
  const relativePath = path.relative(rootDir, resolvedPath);
  const outputFilePath = path.join(rootDir, "test-all.html");

  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    return {
      fileCount: 0,
      outputPath: outputFilePath
    };
  }

  if (!resolvedPath.endsWith(".sb.html")) {
    console.error(`Not a .sb.html file: ${filePath}`);
    return {
      fileCount: 0,
      outputPath: outputFilePath
    };
  }

  generateAllHtml([relativePath], outputFilePath, rootDir, parallel);

  console.log(`Generated single test file: ${relativePath}`);
  console.log(`Generated: ${outputFilePath}`);
  if (parallel > 1) {
    console.log(`Parallel: ${parallel} (iframes run concurrently)`);
  }

  return {
    fileCount: 1,
    outputPath: outputFilePath
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = process.cwd();
  generateTestHtml(rootDir);
}
