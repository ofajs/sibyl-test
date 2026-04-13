#!/usr/bin/env node

import { program } from "commander";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { generateTestHtml } from "../scripts/generate-test-html.js";
import { runTests } from "../scripts/run-tests.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function main() {
  program
    .name("sb-test")
    .description("Sibyl Test - A lightweight browser testing framework")
    .version("1.0.0")
    .option("-b, --browsers <browsers>", "Comma-separated list of browsers to test (webkit,chrome,firefox)", "webkit,chrome,firefox")
    .option("-p, --port <port>", "Port for the test server", "30028")
    .option("--generate-only", "Only generate test-all.html without running tests", false)
    .option("--run-only", "Only run tests without generating test-all.html", false)
    .option("--install", "Install browser dependencies before running tests", false)
    .option("--no-cleanup", "Keep test-all.html after tests complete", false)
    .parse(process.argv);

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
    console.log("\n📝 Generating test-all.html...");
    const result = generateTestHtml(rootDir);
    
    if (result.fileCount === 0) {
      console.log("No .sb.html files found in the project.");
      process.exit(0);
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
    
    if (options.cleanup !== false) {
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
