import { webkit, chromium } from "playwright";
import { Builder } from "selenium-webdriver";
import * as seleniumFirefox from "selenium-webdriver/firefox.js";
import { createServer } from "http-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

async function waitForTestResults(page, evaluateFn) {
  let result = null;
  const maxWaitTime = 5 * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const isFinished = await evaluateFn(page, () => {
      const suite = document.querySelector("sb-test-suite");
      if (!suite) return false;

      const total = suite.totalTests || 0;
      const success = suite.successTests || 0;
      const error = suite.errorTests || 0;
      const pendingUrls = suite.pendingUrls ? suite.pendingUrls.length : 0;

      if (pendingUrls === 0 && (total === 0 || success + error === total)) {
        return { finished: true, hasError: error > 0 };
      }
      return false;
    });

    if (isFinished) {
      result = isFinished.hasError ? "failed" : "passed";
      break;
    }
    await sleep(500);
  }

  return result;
}

async function getTestStats(page, evaluateFn) {
  return await evaluateFn(page, () => {
    const suite = document.querySelector("sb-test-suite");
    if (!suite) return null;

    const total = suite.totalTests || 0;
    const success = suite.successTests || 0;
    const error = suite.errorTests || 0;

    const failedTests = [];
    const groups = suite.shadowRoot.querySelectorAll(".iframe-group");
    groups.forEach((group) => {
      const url = group.getAttribute("data-url");
      const failureItems = group.querySelectorAll(".result-item.failure");
      failureItems.forEach((item) => {
        const nameEl = item.querySelector(".result-name");
        const errorMsgEl = item.querySelector(".error-msg");
        const errorStackEl = item.querySelector(".error-stack");
        const resultContentEl = item.querySelector(".result-content");

        failedTests.push({
          url: url,
          name: nameEl ? nameEl.textContent.trim() : "Unknown",
          message: errorMsgEl ? errorMsgEl.textContent.trim() : "",
          stack: errorStackEl ? errorStackEl.textContent.trim() : "",
          content: resultContentEl ? resultContentEl.textContent.trim() : "",
        });
      });
    });

    return { total, success, error, failedTests };
  });
}

function printSeparator(char = "=", color = colors.dim) {
  console.log(`${color}${char.repeat(50)}${colors.reset}`);
}

function printTestResults(name, result, stats) {
  if (result === "passed") {
    console.log(
      `\n${colors.green}${colors.bright}✓ ${name.toUpperCase()} Tests Passed!${colors.reset}`,
    );
    console.log(`  Total: ${colors.white}${stats.total}${colors.reset}`);
    console.log(`  Success: ${colors.green}${stats.success}${colors.reset}`);
    console.log(`  Error: ${colors.green}${stats.error}${colors.reset}`);
    return { success: true, name, stats };
  } else {
    console.log(
      `\n${colors.red}${colors.bright}✗ ${name.toUpperCase()} Tests Failed!${colors.reset}`,
    );
    console.log(`  Total: ${colors.white}${stats.total}${colors.reset}`);
    console.log(`  Success: ${colors.green}${stats.success}${colors.reset}`);
    console.log(`  Error: ${colors.red}${stats.error}${colors.reset}`);
    console.log(`\n${colors.red}${colors.bright}Failed tests:${colors.reset}`);
    stats.failedTests.forEach((test, index) => {
      console.log(
        `\n${colors.red}${colors.bright}${index + 1}.${colors.reset} ${colors.blue}${test.url}${colors.reset}`,
      );
      console.log(
        `   ${colors.cyan}Name:${colors.reset} ${colors.yellow}${test.name}${colors.reset}`,
      );
      if (test.message) {
        console.log(
          `   ${colors.cyan}Error:${colors.reset} ${colors.red}${test.message}${colors.reset}`,
        );
      }
      if (test.content) {
        console.log(
          `   ${colors.cyan}Content:${colors.reset}\n${colors.yellow}${test.content}${colors.reset}`,
        );
      }
      if (test.stack) {
        console.log(
          `   ${colors.cyan}Stack:${colors.reset}\n${colors.dim}${test.stack}${colors.reset}`,
        );
      }
    });
    return { success: false, name, stats };
  }
}

async function runPlaywrightTests(browserConfig, testUrl, rootDir) {
  const { name, launcher } = browserConfig;
  const dataDir = path.join(rootDir, `.${name}-test-data`);

  console.log("");
  printSeparator();
  console.log(
    `${colors.cyan}${colors.bright}Running tests with ${name.toUpperCase()}${colors.reset}`,
  );
  printSeparator();
  console.log("");

  let context;
  try {
    context = await launcher.launchPersistentContext(dataDir, {
      headless: false,
    });

    const page = context.pages()[0] || (await context.newPage());

    console.log(`Opening: ${colors.blue}${testUrl}${colors.reset}`);
    await page.goto(testUrl);

    console.log(
      `${colors.yellow}Waiting for tests to complete...${colors.reset}`,
    );

    const result = await waitForTestResults(page, (p, fn) => p.evaluate(fn));

    if (!result) {
      console.log(
        `${colors.red}Timeout: Tests did not complete within 5 minutes${colors.reset}`,
      );
      return { success: false, name };
    }

    const stats = await getTestStats(page, (p, fn) => p.evaluate(fn));
    return printTestResults(name, result, stats);
  } catch (error) {
    console.error(
      `${colors.red}Error running ${name} tests:${colors.reset}`,
      error,
    );
    return { success: false, name, error };
  } finally {
    if (context) {
      await context.close();
    }
    deleteDir(dataDir);
  }
}

async function runSeleniumFirefoxTests(testUrl, rootDir) {
  const name = "firefox";

  console.log("");
  printSeparator();
  console.log(
    `${colors.cyan}${colors.bright}Running tests with ${name.toUpperCase()} (Selenium)${colors.reset}`,
  );
  printSeparator();
  console.log("");

  let driver;
  try {
    const options = new seleniumFirefox.Options();
    driver = await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .build();

    console.log(`Opening: ${colors.blue}${testUrl}${colors.reset}`);
    await driver.get(testUrl);

    console.log(
      `${colors.yellow}Waiting for tests to complete...${colors.reset}`,
    );

    const result = await waitForTestResults(driver, (d, fn) =>
      d.executeScript(`return (${fn.toString()})();`),
    );

    if (!result) {
      console.log(
        `${colors.red}Timeout: Tests did not complete within 5 minutes${colors.reset}`,
      );
      return { success: false, name };
    }

    const stats = await getTestStats(driver, (d, fn) =>
      d.executeScript(`return (${fn.toString()})();`),
    );
    return printTestResults(name, result, stats);
  } catch (error) {
    console.error(
      `${colors.red}Error running ${name} tests:${colors.reset}`,
      error,
    );
    return { success: false, name, error };
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

async function runBrowserTests(browserConfig, testUrl, rootDir) {
  if (browserConfig.useSelenium) {
    return await runSeleniumFirefoxTests(testUrl, rootDir);
  }
  return await runPlaywrightTests(browserConfig, testUrl, rootDir);
}

export async function runTests(options = {}) {
  const {
    browsers = ["chrome", "webkit", "firefox"],
    port = 30028,
    rootDir = process.cwd(),
  } = options;

  const allBrowsers = [
    { name: "webkit", launcher: webkit },
    { name: "chrome", launcher: chromium },
    { name: "firefox", useSelenium: true },
  ];

  const selectedBrowsers = allBrowsers.filter((b) => browsers.includes(b.name));

  if (selectedBrowsers.length === 0) {
    console.error(`${colors.red}No valid browsers selected${colors.reset}`);
    return { success: false, results: [] };
  }

  const testFile = path.join(rootDir, "test-all.html");
  if (!fs.existsSync(testFile)) {
    console.error(
      `${colors.red}test-all.html not found. Run generate first.${colors.reset}`,
    );
    return { success: false, results: [] };
  }

  const testUrl = `http://localhost:${port}/test-all.html`;

  const server = createServer({
    root: rootDir,
    cors: true,
  });

  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(
        `${colors.green}Server started at ${colors.blue}http://localhost:${port}${colors.reset}`,
      );
      resolve();
    });
  });

  const results = [];

  try {
    for (const browserConfig of selectedBrowsers) {
      const result = await runBrowserTests(browserConfig, testUrl, rootDir);
      results.push(result);
    }

    console.log("");
    printSeparator("=");
    console.log(`${colors.bright}${colors.white}Summary${colors.reset}`);
    printSeparator("=");

    let allPassed = true;
    for (const result of results) {
      if (result.success) {
        console.log(
          `${colors.green}${colors.bright}✓ PASSED${colors.reset} ${colors.cyan}${result.name.toUpperCase()}${colors.reset}`,
        );
      } else {
        console.log(
          `${colors.red}${colors.bright}✗ FAILED${colors.reset} ${colors.cyan}${result.name.toUpperCase()}${colors.reset}`,
        );
        allPassed = false;
      }
    }

    console.log("");
    if (!allPassed) {
      return { success: false, results };
    } else {
      console.log(
        `${colors.green}${colors.bright}All tests passed!${colors.reset}`,
      );
      return { success: true, results };
    }
  } finally {
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browserFilter = process.env.BROWSER;
  const browsers = browserFilter
    ? [browserFilter]
    : ["webkit", "chrome", "firefox"];
  const result = await runTests({ browsers });
  if (!result.success) {
    process.exit(1);
  }
}
