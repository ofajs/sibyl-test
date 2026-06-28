#!/usr/bin/env node

import { program } from "commander";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { generateTestHtml, generateSingleTestHtml } from "../scripts/generate-test-html.js";
import { runTests } from "../scripts/run-tests.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

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
  $ sb-test -f test/foo.sb.html    Test a single file
  $ sb-test -f test/foo.sb.html -b firefox   Test single file with Firefox only
  $ sb-test --install              Install browser dependencies
  $ sb-test --generate-only        Only generate test-all.html
  $ sb-test --run-only             Only run tests (skip generation)

Language:
  $ sb-test --help                 Show English help
  $ sb-test --help zh              显示中文帮助
  $ sb-test --help jp              Show Japanese help (日本語ヘルプ)
`;

const helpZh = `
示例：
  $ sb-test                        使用默认浏览器运行所有测试
  $ sb-test -b webkit,chrome       仅在 WebKit 和 Chrome 中测试
  $ sb-test -f test/foo.sb.html    测试单个文件
  $ sb-test -f test/foo.sb.html -b firefox  测试单个文件，仅使用 Firefox
  $ sb-test --install              安装浏览器依赖
  $ sb-test --generate-only        仅生成 test-all.html，不运行测试
  $ sb-test --run-only             仅运行测试，跳过生成阶段

语言切换：
  $ sb-test --help                 Show English help
  $ sb-test --help zh              显示中文帮助
  $ sb-test --help jp              Show Japanese help (日本語ヘルプ)
`;

const helpJa = `
例：
  $ sb-test                        デフォルトブラウザですべてのテストを実行
  $ sb-test -b webkit,chrome       WebKit と Chrome のみでテスト
  $ sb-test -f test/foo.sb.html    単一ファイルをテスト
  $ sb-test -f test/foo.sb.html -b firefox  単一ファイルを Firefox のみでテスト
  $ sb-test --install              ブラウザ依存関係をインストール
  $ sb-test --generate-only        test-all.html のみを生成（テストは実行しない）
  $ sb-test --run-only             生成をスキップしてテストのみ実行

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
      .option("--generate-only", "仅生成 test-all.html，不运行测试", false)
      .option("--run-only", "仅运行测试，跳过生成 test-all.html", false)
      .option("--install", "运行测试前安装浏览器依赖", false)
      .option("--keep-test-file", "测试完成后保留 test-all.html", false)
      .option("-f, --file <path>", "测试单个 .sb.html 文件，而非所有文件")
      .addHelpText("after", helpZh)
      .parse(cleanedArgs);
  } else if (lang === 'jp') {
    program
      .name("sb-test")
      .description("Sibyl Test - 軽量ブラウザテストフレームワーク")
      .version(pkg.version)
      .option("-b, --browsers <browsers>", "テストするブラウザをカンマ区切りで指定 (webkit,chrome,firefox)", "webkit,chrome,firefox")
      .option("-p, --port <port>", "テストサーバーのポート", "30028")
      .option("--generate-only", "test-all.html のみを生成（テストは実行しない）", false)
      .option("--run-only", "生成をスキップしてテストのみ実行", false)
      .option("--install", "テスト実行前にブラウザ依存関係をインストール", false)
      .option("--keep-test-file", "テスト完了後も test-all.html を保持", false)
      .option("-f, --file <path>", "単一の .sb.html ファイルをテスト")
      .addHelpText("after", helpJa)
      .parse(cleanedArgs);
  } else {
    program
      .name("sb-test")
      .description("Sibyl Test - A lightweight browser testing framework")
      .version(pkg.version)
      .option("-b, --browsers <browsers>", "Comma-separated list of browsers to test (webkit,chrome,firefox)", "webkit,chrome,firefox")
      .option("-p, --port <port>", "Port for the test server", "30028")
      .option("--generate-only", "Only generate test-all.html without running tests", false)
      .option("--run-only", "Only run tests without generating test-all.html", false)
      .option("--install", "Install browser dependencies before running tests", false)
      .option("--keep-test-file", "Keep test-all.html after tests complete", false)
      .option("-f, --file <path>", "Test a single .sb.html file instead of all files")
      .addHelpText("after", helpEn)
      .parse(cleanedArgs);
  }

  const options = program.opts();
  const browsers = options.browsers.split(",").map(b => b.trim());
  const port = parseInt(options.port);
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

  if (!options.runOnly) {
    if (options.file) {
      console.log(`\n📝 Generating test-all.html for single file: ${options.file}...`);
      const result = generateSingleTestHtml(rootDir, options.file);

      if (result.fileCount === 0) {
        process.exit(1);
      }
    } else {
      console.log("\n📝 Generating test-all.html...");
      const result = generateTestHtml(rootDir);

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
      testResult = await runTests({ browsers, port, rootDir });
    } catch (error) {
      console.error("Test execution error:", error.message);
      testResult = { success: false };
    }
    
    if (!options.keepTestFile) {
      const testFile = path.join(rootDir, "test-all.html");
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log("\n🧹 Cleaned up test-all.html");
      }
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
