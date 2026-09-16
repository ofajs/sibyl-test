# Sibyl Test

[中文版](readme/cn.md) | [日本語](readme/jp.md)

A lightweight, zero-dependency browser testing framework built with Web Components.

## Features

- 🚀 **Zero Dependencies** - Core components work directly in the browser with no installation required
- 🧩 **Web Components** - Built on Web Components, usable in any framework
- 📝 **Simple & Intuitive** - Write tests using HTML tags, straightforward and clear
- ⚡ **Parallel Testing** - Supports parallel test execution for improved efficiency
- 🌐 **Multi-Browser Support** - Supports WebKit, Chrome, Firefox and more
- 🔓 **Non-Incognito Mode** - Uses normal browser mode, can test Service Worker, Origin Private File System and other advanced APIs
- 🔧 **CLI Tools** - Command-line tools for easy integration into development workflows
- 🤖 **CI/CD Support** - GitHub Action for seamless CI/CD integration

## Quick Start

### Use Directly in Browser

Sibyl Test can be used directly in HTML via CDN without any installation. It is recommended to name files with `.sb.html` extension (e.g., `test.sb.html`) for easy automation.

Create an HTML file, for example `test.sb.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Tests</title>
  <script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test.mjs"></script>
</head>
<body>
  <h1>My Tests</h1>

  <sb-test name="Simple addition test">
    <template>
      <script>
        const a = 1;
        const b = 2;

        return {
          assert: a + b === 3,
          content: { a, b, sum: a + b }
        };
      </script>
    </template>
  </sb-test>

  <sb-test name="Async test example">
    <template>
      <script>
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        await delay(100);
        const result = 42;

        return {
          assert: result === 42,
          content: { result }
        };
      </script>
    </template>
  </sb-test>
</body>
</html>
```

### sb-test Component

A single test component for writing individual test cases.

#### Attributes

- `name` - Test name (required)
- `parallel` - Whether to execute in parallel (optional)

#### Return Value

Test scripts need to return an object:

```javascript
{
  assert: boolean,  // Whether the test passes
  content: any      // Optional, test result content
}
```

#### Examples

```html
<!-- Basic test -->
<sb-test name="Basic test">
  <template>
    <script>
      return {
        assert: true
      };
    </script>
  </template>
</sb-test>

<!-- Parallel test -->
<sb-test name="Parallel test" parallel>
  <template>
    <script>
      return {
        assert: 1 + 1 === 2,
        content: { result: 2 }
      };
    </script>
  </template>
</sb-test>

<!-- Async test -->
<sb-test name="Async test">
  <template>
    <script>
      const data = await fetch('/api/data').then(r => r.json());

      return {
        assert: data.success === true,
        content: data
      };
    </script>
  </template>
</sb-test>
```

### sb-test-suite Component

Test suite component for combining multiple test files.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Tests</title>
  <script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test-suite.mjs"></script>
</head>
<body>
  <sb-test-suite>
    <include src="./test1.sb.html"></include>
    <include src="./test2.sb.html"></include>
    <include src="./test3.sb.html"></include>
  </sb-test-suite>
</body>
</html>
```

### FAQ

#### How to use ES Modules in tests?

```html
<sb-test name="ES Module test">
  <template>
    <script type="module">
      import { something } from './module.js';

      return {
        assert: something === 'expected',
        content: { something }
      };
    </script>
  </template>
</sb-test>
```

#### How to test async operations?

```html
<sb-test name="Async operation test">
  <template>
    <script>
      const result = await someAsyncFunction();

      return {
        assert: result === 'expected',
        content: { result }
      };
    </script>
  </template>
</sb-test>
```

#### How to skip a test?

You can comment out the entire test tag to skip a test.

## CLI Tools (Multi-Browser Testing)

If you need to run tests across multiple browsers (WebKit, Chrome, Firefox), we provide CLI tools to automate this process.

This command-line tool collects all `.sb.html` files in your project into a test manifest (`test-index.html`) and runs the tests across multiple browser engines. The manifest is kept in your project: it is generated on first run, then auto-synced afterwards — so you can manually control test order, per-file concurrency, and skipped files (see [Test Manifest](#test-manifest)).

### Installation

```bash
npm install sibyl-test --save-dev
```

### Basic Usage

```bash
# Run all tests (default uses webkit, chrome, firefox)
npx sb-test

# Specify browsers
npx sb-test --browsers webkit,chrome

# Sync the test manifest only
npx sb-test --generate-only

# Run tests only (skip manifest sync)
npx sb-test --run-only

# Install browser dependencies
npx sb-test --install
```

### Using npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "sb-test"
  }
}
```

Then run:

```bash
npm test
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --browsers <browsers>` | Browsers to test (comma-separated) | `webkit,chrome,firefox` |
| `-p, --port <port>` | Test server port | `30028` |
| `-t, --timeout <minutes>` | Per-browser test timeout in minutes | `5` |
| `-c, --concurrency <n>` | Number of test files to run in parallel (iframes in `test-index.html`) | `1` |
| `-f, --file <paths...>` | Test specific HTML file(s), multiple allowed (space- or comma-separated, or repeat `-f`; suffix not limited to `.sb.html`) | All files |
| `--generate-only` | Sync the test manifest only, without running tests | `false` |
| `--run-only` | Run tests only, skip manifest sync | `false` |
| `--force-regenerate` | Discard the existing manifest and regenerate it from scan | `false` |
| `--install` | Install browser dependencies | `false` |

### Examples

```bash
# Run tests on all browsers
sb-test

# Test only on WebKit
sb-test --browsers webkit

# Test on Chrome and Firefox
sb-test --browsers chrome,firefox

# Install browser dependencies and run tests
sb-test --install

# Test only a specific file
sb-test -f test/foo.sb.html

# Test multiple files (space- or comma-separated, or repeat -f)
sb-test -f test/foo-sb.html test/bar-sb.html
sb-test -f "test/foo-sb.html,test/bar-sb.html"
sb-test -f test/foo-sb.html -f test/bar-sb.html

# Test specific files, using only Firefox
sb-test -f test/foo-sb.html -b firefox

# Sync the test manifest only
sb-test --generate-only
```

## Test Manifest

Every regular run keeps a `test-index.html` manifest in your project root. You never have to touch it, but you can edit it freely:

```html
<sb-test-suite parallel="4">
  <!-- include order = execution order -->
  <include src="./setup.sb.html" exclusive></include>
  <include src="./core/a.sb.html"></include>
  <include src="./core/b.sb.html"></include>
  <include src="./flaky.sb.html" skip></include>
</sb-test-suite>
```

On every run the manifest is synced against a fresh project scan:

- New `.sb.html` files are **appended to the end** of the include list (your manual order is never reshuffled).
- Entries whose file no longer exists are **removed**.
- Everything you edited by hand — order, attributes, comments — is **preserved**.

Per-include attributes:

| Attribute | Effect |
|-----------|--------|
| `skip` | File is kept in the manifest but not executed (e.g. temporarily disabled) |
| `exclusive` | File runs alone: it waits until no other file is running, and no other file starts until it finishes — ideal for setup files or tests that need a clean browser state |

Suite attribute `parallel="n"` on `<sb-test-suite>` sets how many files run concurrently. The CLI flag `-c <n>` overwrites it only when explicitly passed; otherwise your manual value is kept.

> Use `-f` to run an ad-hoc subset of files: it writes a temporary `test-run.html` instead, so your curated manifest is never touched. The temp file is removed when the run finishes.

## GitHub Actions Integration

### Using the Predefined Action

Create `.github/workflows/test.yml` in your project:

```yaml
name: Browser Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ofajs/sibyl-test@v1
        with:
          browsers: 'webkit,chrome,firefox'
```

### Custom Configuration

```yaml
name: Browser Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test-chrome-firefox:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ofajs/sibyl-test@v1
        with:
          browsers: 'chrome,firefox'
  test-webkit:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ofajs/sibyl-test@v1
        with:
          browsers: 'webkit'
```

> **Note**: WebKit is recommended to run on macOS for full browser environment support. APIs like Origin Private File System (OPFS) may be limited on Linux environments.

## API

### generateTestHtml(rootDir)

Syncs the test manifest (`test-index.html`): generates it on first run, then reconciles it with a fresh project scan (new files appended, deleted files removed, manual edits preserved). Pass `{ force: true }` to rebuild from scratch, or `{ parallel: 2, parallelExplicit: true }` to write the suite-level concurrency.

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Manifest: ${result.outputPath}`);
console.log(`Added: ${result.added}, Removed: ${result.removed}`);
```

### generateFilesHtml(rootDir, filePaths, options)

Generates a temporary `test-run.html` for explicitly specified HTML file(s) — multiple files supported, and the suffix is not limited to `.sb.html` (only `.html` is required). The curated `test-index.html` is not touched.

```javascript
import { generateFilesHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateFilesHtml('/path/to/project', ['test/foo.sb.html', 'test/bar-sb.html']);
console.log(`Included ${result.fileCount} file(s)`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

Runs browser tests.

```javascript
import { runTests } from 'sibyl-test/scripts/run-tests.js';

const result = await runTests({
  browsers: ['webkit', 'chrome'],
  port: 30028,
  rootDir: '/path/to/project',
  testHtml: 'test-index.html' // manifest to open; defaults to test-index.html
});

if (result.success) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}
```

## How It Works

1. **Sync Phase**: The CLI scans all `.sb.html` files in the project and syncs `test-index.html` (generate on first run; reconcile afterwards). `-f` runs generate a temporary `test-run.html` instead.

2. **Test Phase**:
   - Starts a local HTTP server
   - Uses Playwright (WebKit, Chrome) or Selenium (Firefox) to open the test page
   - Waits for all tests to complete
   - Collects and displays test results

3. **Cleanup Phase**: The temporary `test-run.html` (from `-f` runs) is deleted. `test-index.html` is kept — your manual orchestration survives across runs.

## Example Projects

See the `examples/` directory for more usage examples:

- [test-examples.sb.html](examples/test-examples.sb.html) - Basic test examples
- [test-parallel.sb.html](examples/test-parallel.sb.html) - Parallel test examples
- [all.html](examples/all.html) - Test suite example

## Browser Support

- WebKit (Safari)
- Chrome / Chromium
- Firefox

## Dependencies

### Core Components (Browser-side)

Zero dependencies! Core components are built on native Web Components and can be used directly in the browser.

### CLI Tools (Node.js-side)

- `playwright` - Used for WebKit and Chrome testing
- `selenium-webdriver` - Used for Firefox testing
- `http-server` - Local test server
- `commander` - CLI argument parsing

## Difference from Playwright/Test

Playwright/Test runs browsers in incognito mode, which prevents access to certain browser APIs like Service Worker and Origin Private File System. Sibyl Test uses normal browser mode, allowing full access to these APIs.

Additionally, Playwright/Test uses `spec.js` mode requiring you to learn specific testing syntax. Sibyl Test uses HTML for writing tests without any new syntax to learn — you don't even need to understand the CLI tools. Simply open the HTML file on a static server to run tests and view results.

Sibyl Test's CLI optimizes the process by packaging test cases into an HTML file first, then running them in the browser, making it faster than Playwright/Test.

## FAQ

### How to use ES Modules in tests?

You can use `import` directly within `<script type="module">` tags. Note that namespace imports like `import * as` are not currently supported.

### How to test async operations?

You can test async operations using the `await` keyword in test scripts.

### How to skip a test?

You can comment out the entire test tag to skip a test.

### How to run local-only tests that shouldn't run in CI?

Name the file so it doesn't end with `.sb.html` (e.g. `local-sb.html`). The default scan only picks up `.sb.html` files, so `npm test` / CI will skip it. Run it explicitly with `sb-test -f local-sb.html` (multiple files allowed).

## Contributing

Issues and Pull Requests are welcome!

## License

Apache-2.0
