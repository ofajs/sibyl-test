#!/usr/bin/env node

import { program } from "commander";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import {
  generateTestHtml,
  generateFilesHtml,
  MANIFEST_NAME,
  TEMP_MANIFEST_NAME,
} from "../scripts/generate-test-html.js";
import { runTests } from "../scripts/run-tests.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

// 收集 -f 指定的文件：支持 variadic（空格分隔）、逗号分隔、重复 -f
function collectFiles(value, previous) {
  return previous.concat(value.split(",").map(v => v.trim()).filter(Boolean));
}

async function installDependencies() {
  console.log("Installing Playwright browsers...");
  
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["playwright", "install", "webkit", "chromium"], {
      stdio: "inherit",
      shell: true
    });
    
    child.on("close", (code) => {
      if (code === 0) {
        console.log("Playwright browsers installed successfully!");
        resolve();
      } else {
        reject(new Error(`Playwright installation failed with code ${code}`));
      }
    });
    
    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function installSelenium() {
  console.log("Checking Firefox and Selenium setup...");
  
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["geckodriver", "--version"], {
      stdio: "inherit",
      shell: true
    });
    
    child.on("close", (code) => {
      if (code === 0) {
        console.log("Geckodriver is available!");
        resolve();
      } else {
        console.log("Note: For Firefox testing, ensure Firefox and geckodriver are installed.");
        resolve();
      }
    });
    
    child.on("error", () => {
      console.log("Note: For Firefox testing, ensure Firefox and geckodriver are installed.");
      resolve();
    });
  });
}

const helpEn = `
Examples:
  $ sb-test                        Run all tests with default browsers
  $ sb-test -b webkit,chrome       Test only on WebKit and Chrome
  $ sb-test -c 2                   Run 2 test files in parallel
  $ sb-test -f test/foo.sb.html    Test specific file(s)
  $ sb-test -f test/a-sb.html test/b-sb.html   Test multiple files
  $ sb-test -f test/foo.sb.html -b firefox   Test specific file with Firefox only
  $ sb-test --install              Install browser dependencies
  $ sb-test --generate-only        Only sync test-index.html
  $ sb-test --run-only             Only run tests (skip manifest sync)
  $ sb-test --force-regenerate     Rebuild test-index.html from scratch

Test manifest (test-index.html):
  Generated on first run, then kept in your project and auto-synced:
  new .sb.html files are appended, deleted files are removed, while your
  manual edits (order, skip, exclusive, parallel) are preserved.
  See the README "Test manifest" section for details.

Language:
  $ sb-test --help                 Show English help
  $ sb-test --help zh              显示中文帮助
  $ sb-test --help jp              Show Japanese help (日本語ヘルプ)
`;

const helpZh = `
示例：
  $ sb-test                        使用默认浏览器运行所有测试
  $ sb-test -b webkit,chrome       仅在 WebKit 和 Chrome 中测试
  $ sb-test -c 2                   并发运行 2 个测试文件
  $ sb-test -f test/foo.sb.html    测试指定文件
  $ sb-test -f test/a-sb.html test/b-sb.html    测试多个文件
  $ sb-test -f test/foo.sb.html -b firefox  测试指定文件，仅使用 Firefox
  $ sb-test --install              安装浏览器依赖
  $ sb-test --generate-only        仅同步 test-index.html，不运行测试
  $ sb-test --run-only             仅运行测试，跳过清单同步
  $ sb-test --force-regenerate     丢弃现有 test-index.html，重新扫描生成

测试清单（test-index.html）：
  首次运行自动生成，之后常驻项目并被自动“查漏补缺”：
  新增的 .sb.html 会追加进来，已删除的会被移除，
  而手动编辑（顺序、skip、exclusive、parallel）都会保留。
  详见 README“测试清单”章节。

语言切换：
  $ sb-test --help                 Show English help
  $ sb-test --help zh              显示中文帮助
  $ sb-test --help jp              Show Japanese help (日本語ヘルプ)
`;

const helpJa = `
例：
  $ sb-test                        デフォルトブラウザですべてのテストを実行
  $ sb-test -b webkit,chrome       WebKit と Chrome のみでテスト
  $ sb-test -c 2                   2つのテストファイルを並列実行
  $ sb-test -f test/foo.sb.html    指定ファイルをテスト
  $ sb-test -f test/a-sb.html test/b-sb.html   複数ファイルをテスト
  $ sb-test -f test/foo.sb.html -b firefox  指定ファイルを Firefox のみでテスト
  $ sb-test --install              ブラウザ依存関係をインストール
  $ sb-test --generate-only         test-index.html のみ同期（テストは実行しない）
  $ sb-test --run-only             同期をスキップしてテストのみ実行
  $ sb-test --force-regenerate     test-index.html を再生成

テストマニフェスト（test-index.html）：
  初回実行時に自動生成され、以降はプロジェクトに常駐し自動同期されます：
  新しい .sb.html は末尾に追加され、削除されたファイルは取り除かれます。
  手動編集（順序、skip、exclusive、parallel）は保持されます。

言語切替：
  $ sb-test --help                 Show English help
  $ sb-test --help zh              显示中文帮助
  $ sb-test --help jp              Show Japanese help (日本語ヘルプ)
`;

function cleanArgsForHelp() {
  const args = process.argv.slice(2);
  const result = [];
  let skipNext = false;
  for (let i = 0; i < args.length; i++) {
    if (skipNext) { skipNext = false; continue; }
    if ((args[i] === '--help' || args[i] === '-h') && i + 1 < args.length && (args[i + 1] === 'zh' || args[i + 1] === 'jp')) {
      result.push(args[i]);
      skipNext = true;
    } else {
      result.push(args[i]);
    }
  }
  return [process.argv[0], process.argv[1], ...result];
}

function detectHelpLang() {
  const args = process.argv;
  const helpIdx = args.findIndex(a => a === '--help' || a === '-h');
  if (helpIdx === -1) return 'en';
  const lang = args[helpIdx + 1];
  if (lang === 'zh') return 'zh';
  if (lang === 'jp') return 'jp';
  return 'en';
}

async function main() {
  const lang = detectHelpLang();
  const cleanedArgs = cleanArgsForHelp();

  if (lang === 'zh') {
    program
      .name("sb-test")
      .description("Sibyl Test - 轻量级浏览器测试框架")
      .version(pkg.version)
      .option("-b, --browsers <browsers>", "指定测试浏览器，多个用逗号分隔 (webkit,chrome,firefox)", "webkit,chrome,firefox")
      .option("-p, --port <port>", "测试服务器端口", "30028")
      .option("-c, --concurrency <n>", "测试文件并发数：同时运行的 iframe 数量（>1 时并行）", undefined)
      .option("--generate-only", "仅同步 test-index.html，不运行测试", false)
      .option("--run-only", "仅运行测试，跳过清单同步", false)
      .option("--force-regenerate", "丢弃现有 test-index.html，重新扫描生成", false)
      .option("--install", "运行测试前安装浏览器依赖", false)
      .option("-f, --file <paths...>", "测试指定的 HTML 文件（可多个：空格或逗号分隔，或重复 -f；后缀不限于 .sb.html）", collectFiles, [])
      .addHelpText("after", helpZh)
      .parse(cleanedArgs);
  } else if (lang === 'jp') {
    program
      .name("sb-test")
      .description("Sibyl Test - 軽量ブラウザテストフレームワーク")
      .version(pkg.version)
      .option("-b, --browsers <browsers>", "テストするブラウザをカンマ区切りで指定 (webkit,chrome,firefox)", "webkit,chrome,firefox")
      .option("-p, --port <port>", "テストサーバーのポート", "30028")
      .option("-c, --concurrency <n>", "テストファイルの並列数：同時に実行する iframe 数（>1 で並列）", undefined)
      .option("--generate-only", "test-index.html のみ同期（テストは実行しない）", false)
      .option("--run-only", "同期をスキップしてテストのみ実行", false)
      .option("--force-regenerate", "既存の test-index.html を破棄して再生成", false)
      .option("--install", "テスト実行前にブラウザ依存関係をインストール", false)
      .option("-f, --file <paths...>", "テストする HTML ファイルを指定（複数可：スペース・カンマ区切り、-f の繰り返し；拡張子は .sb.html に限定されない）", collectFiles, [])
      .addHelpText("after", helpJa)
      .parse(cleanedArgs);
  } else {
    program
      .name("sb-test")
      .description("Sibyl Test - A lightweight browser testing framework")
      .version(pkg.version)
      .option("-b, --browsers <browsers>", "Comma-separated list of browsers to test (webkit,chrome,firefox)", "webkit,chrome,firefox")
      .option("-p, --port <port>", "Port for the test server", "30028")
      .option("-c, --concurrency <n>", "Number of test files to run in parallel (iframes, >1 for concurrent)", undefined)
      .option("--generate-only", "Only sync test-index.html without running tests", false)
      .option("--run-only", "Only run tests, skip manifest sync", false)
      .option("--force-regenerate", "Discard existing test-index.html and regenerate from scan", false)
      .option("--install", "Install browser dependencies before running tests", false)
      .option("-f, --file <paths...>", "Test specific HTML file(s), multiple allowed (space- or comma-separated, or repeated -f; suffix not limited to .sb.html)", collectFiles, [])
      .addHelpText("after", helpEn)
      .parse(cleanedArgs);
  }

  const options = program.opts();
  const browsers = options.browsers.split(",").map(b => b.trim());
  const port = parseInt(options.port);
  // -c 未传时保持 undefined，同步清单时不去覆盖手动配置的 parallel 属性
  const concurrencyExplicit = options.concurrency !== undefined;
  const concurrency = Math.max(1, parseInt(options.concurrency ?? "1") || 1);
  const rootDir = process.cwd();

  if (options.install) {
    try {
      await installDependencies();
      await installSelenium();
    } catch (error) {
      console.error("Failed to install dependencies:", error.message);
      process.exit(1);
    }
  }

  // 本次运行要打开的清单：-f 模式用临时清单，常规模式用常驻清单
  let manifestForRun = MANIFEST_NAME;

  if (!options.runOnly) {
    const files = options.file || [];
    if (files.length > 0) {
      console.log(`\n📝 Generating temporary run file for ${files.length} file(s): ${files.join(", ")}...`);
      const result = generateFilesHtml(rootDir, files, { parallel: concurrency });

      if (result.fileCount === 0) {
        process.exit(1);
      }
      manifestForRun = TEMP_MANIFEST_NAME;
    } else {
      console.log("\n📝 Syncing test manifest (test-index.html)...");
      const result = generateTestHtml(rootDir, {
        parallel: concurrency,
        parallelExplicit: concurrencyExplicit,
        force: options.forceRegenerate,
      });

      if (result.fileCount === 0) {
        console.log("No .sb.html files found in the project.");
        process.exit(0);
      }
    }
  }

  if (!options.generateOnly) {
    console.log("\n🚀 Running tests...\n");
    let testResult;
    try {
      testResult = await runTests({ browsers, port, rootDir, testHtml: manifestForRun });
    } catch (error) {
      console.error("Test execution error:", error.message);
      testResult = { success: false };
    }

    // 临时清单（-f 模式）用完即删；常驻 test-index.html 保留，手动编排不会丢失
    const tempFile = path.join(rootDir, TEMP_MANIFEST_NAME);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log(`\n🧹 Cleaned up ${TEMP_MANIFEST_NAME}`);
    }

    if (!testResult.success) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
