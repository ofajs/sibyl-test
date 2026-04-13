# Sibyl Test

[English](../README.md) | [日本語](./jp.md)

一个轻量级、零依赖的浏览器测试框架，基于 Web Components 构建。

## 特性

- 🚀 **零依赖** - 核心组件无需安装任何依赖，直接在浏览器中使用
- 🧩 **Web Components** - 基于 Web Components 构建，可在任何框架中使用
- 📝 **简单易用** - 使用 HTML 标签编写测试，直观明了
- ⚡ **并行测试** - 支持并行执行测试，提高测试效率
- 🌐 **多浏览器支持** - 支持 WebKit、Chrome、Firefox 等多种浏览器
- 🔓 **非隐私模式** - 使用正常模式的浏览器，可测试 Service Worker、Origin Private File System 等 API
- 🔧 **CLI 工具** - 提供命令行工具，方便集成到开发流程
- 🤖 **CI/CD 支持** - 提供 GitHub Action，轻松集成到 CI/CD 流程

## 与 Playwright/Test 的区别

Playwright/Test 在隐私模式下运行浏览器，这导致某些浏览器 API 无法使用，例如 Service Worker 和 Origin Private File System。而 Sibyl Test 使用正常模式的浏览器，可以完整访问这些 API。

此外，Playwright/Test 采用 `spec.js` 模式编写测试，需要学习特定的测试语法。Sibyl Test 则使用 HTML 编写测试，无需学习新语法——你甚至不需要了解 CLI 工具，只需要在静态服务器下打开 HTML 文件，即可进行测试并查看结果。

## 快速开始

### 直接在浏览器中使用

Sibyl Test 可以直接通过 CDN 在 HTML 中使用，无需任何安装步骤。

创建一个 HTML 文件，例如 `test.sb.html`：

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

### sb-test 组件

单个测试组件，用于编写独立的测试用例。

#### 属性

- `name` - 测试名称（必填）
- `parallel` - 是否并行执行（可选）

#### 返回值

测试脚本需要返回一个对象：

```javascript
{
  assert: boolean,  // 测试是否通过
  content: any      // 可选，测试结果内容
}
```

#### 示例

```html
<!-- 基本测试 -->
<sb-test name="Basic test">
  <template>
    <script>
      return {
        assert: true
      };
    </script>
  </template>
</sb-test>

<!-- 并行测试 -->
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

<!-- 异步测试 -->
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

### sb-test-suite 组件

测试套件组件，用于组合多个测试文件。

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

### 常见问题

#### 如何在测试中使用 ES Modules？

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

#### 如何测试异步操作？

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

## CLI 工具（多浏览器测试）

如果你需要在多个浏览器（WebKit、Chrome、Firefox）中运行测试，我们提供了 CLI 工具来自动化这一过程。

### 安装

```bash
npm install sibyl-test --save-dev
```

### 基本用法

```bash
# 运行所有测试（默认使用 webkit、chrome、firefox）
npx sb-test

# 指定浏览器
npx sb-test --browsers webkit,chrome

# 只生成测试文件
npx sb-test --generate-only

# 只运行测试（不生成）
npx sb-test --run-only

# 安装浏览器依赖
npx sb-test --install
```

### 使用 npm scripts

在 `package.json` 中添加：

```json
{
  "scripts": {
    "test": "sb-test"
  }
}
```

然后运行：

```bash
npm test
```

### CLI 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-b, --browsers <browsers>` | 指定测试浏览器（逗号分隔） | `webkit,chrome,firefox` |
| `-p, --port <port>` | 测试服务器端口 | `30028` |
| `--generate-only` | 只生成测试文件 | `false` |
| `--run-only` | 只运行测试 | `false` |
| `--install` | 安装浏览器依赖 | `false` |
| `--keep-test-file` | 保留生成的测试文件 | `false` |

### 示例

```bash
# 运行所有浏览器的测试
sb-test

# 只在 WebKit 中测试
sb-test --browsers webkit

# 在 Chrome 和 Firefox 中测试
sb-test --browsers chrome,firefox

# 安装浏览器依赖并运行测试
sb-test --install

# 只生成测试文件
sb-test --generate-only
```

## GitHub Actions 集成

### 使用预定义的 Action

在你的项目中创建 `.github/workflows/test.yml`：

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

### 自定义配置

```yaml
name: Browser Tests
on: [push, pull_request]

jobs:
  test-webkit:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx playwright install webkit
      - run: npx sb-test --browsers webkit

  test-chrome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: xvfb-run npx sb-test --browsers chrome
```

## API

### generateTestHtml(rootDir)

生成测试 HTML 文件。

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

运行浏览器测试。

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

## 工作原理

1. **生成阶段**：CLI 工具扫描项目中的所有 `.sb.html` 文件，生成一个包含所有测试的 `test-all.html` 文件。

2. **测试阶段**：
   - 启动本地 HTTP 服务器
   - 使用 Playwright（WebKit、Chrome）或 Selenium（Firefox）打开测试页面
   - 等待所有测试完成
   - 收集并显示测试结果

3. **清理阶段**：删除生成的 `test-all.html` 文件（除非使用 `--no-cleanup` 选项）

## 示例项目

查看 `examples/` 目录了解更多使用示例：

- [test-examples.sb.html](examples/test-examples.sb.html) - 基本测试示例
- [test-parallel.sb.html](examples/test-parallel.sb.html) - 并行测试示例
- [all.html](examples/all.html) - 测试套件示例

## 浏览器支持

- WebKit (Safari)
- Chrome / Chromium
- Firefox

## 依赖说明

### 核心组件（浏览器端）

无依赖！核心组件基于原生 Web Components 构建，可直接在浏览器中使用。

### CLI 工具（Node.js 端）

- `playwright` - 用于 WebKit 和 Chrome 测试
- `selenium-webdriver` - 用于 Firefox 测试
- `http-server` - 本地测试服务器
- `commander` - CLI 参数解析

## 常见问题

### 如何在测试中使用 ES Modules？

在 `<script type="module">` 标签中直接使用 `import` 即可。

### 如何测试异步操作？

在测试脚本中使用 `await` 关键字即可测试异步操作。

### 如何跳过某个测试？

可以注释掉整个测试标签来跳过测试。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

Apache-2.0