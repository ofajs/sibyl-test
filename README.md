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

This command-line tool automatically scans all `.sb.html` files in your project, generates a `test-all.html` file containing all test cases, and runs tests across multiple browser engines.

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

# Generate test files only
npx sb-test --generate-only

# Run tests only (no generation)
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
| `--generate-only` | Generate test files only | `false` |
| `--run-only` | Run tests only | `false` |
| `--install` | Install browser dependencies | `false` |
| `--keep-test-file` | Keep generated test files | `false` |

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

# Generate test files only
sb-test --generate-only
```

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

Generates the test HTML file.

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

Runs browser tests.

```javascript
import { runTests } from 'sibyl-test/scripts/run-tests.js';

const result = await runTests({
  browsers: ['webkit', 'chrome'],
  port: 30028,
  rootDir: '/path/to/project'
});

if (result.success) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}
```

## How It Works

1. **Generation Phase**: The CLI tool scans all `.sb.html` files in the project and generates a `test-all.html` file containing all tests.

2. **Test Phase**:
   - Starts a local HTTP server
   - Uses Playwright (WebKit, Chrome) or Selenium (Firefox) to open the test page
   - Waits for all tests to complete
   - Collects and displays test results

3. **Cleanup Phase**: Deletes the generated `test-all.html` file (unless using `--no-cleanup`)

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

You can use `import` directly within `<script type="module">` tags.

### How to test async operations?

You can test async operations using the `await` keyword in test scripts.

### How to skip a test?

You can comment out the entire test tag to skip a test.

## Contributing

Issues and Pull Requests are welcome!

## License

Apache-2.0
