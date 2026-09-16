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

## 快速开始

### 直接在浏览器中使用

Sibyl Test 可以直接通过 CDN 在 HTML 中使用，无需任何安装步骤。建议创建的文件以 `.sb.html` 结尾，例如 `test.sb.html`，方便后续的自动化测试去使用。

例如下面创建一个 HTML 文件，例如 `test.sb.html`：

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

该命令行工具会把项目中的所有 `.sb.html` 文件收集到一份测试清单（`test-index.html`）中，并在多种浏览器内核中运行这些测试。清单会常驻项目：首次运行自动生成，之后自动“查漏补缺”式同步——你可以手动控制测试顺序、按文件并发和跳过某些文件（见[测试清单](#测试清单)章节）。

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

# 只同步测试清单
npx sb-test --generate-only

# 只运行测试（跳过清单同步）
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
| `-t, --timeout <minutes>` | 单个浏览器的测试超时（分钟） | `5` |
| `-c, --concurrency <n>` | 测试文件并发数（同时运行的 iframe 数量） | `1` |
| `-f, --file <paths...>` | 测试指定的 HTML 文件（可多个：空格或逗号分隔，或重复 `-f`；后缀不限于 `.sb.html`） | 所有文件 |
| `--generate-only` | 只同步测试清单，不运行测试 | `false` |
| `--run-only` | 只运行测试，跳过清单同步 | `false` |
| `--force-regenerate` | 丢弃现有清单，重新扫描生成 | `false` |
| `--install` | 安装浏览器依赖 | `false` |

### 示例

```bash
# 运行所有浏览器的测试
sb-test

# 只在 WebKit 中测试
sb-test --browsers webkit

# 在 Chrome 和 Firefox 中测试
sb-test --browsers chrome,firefox

# 只测试指定文件
sb-test -f test/foo.sb.html

# 测试多个文件（空格或逗号分隔，也可重复 -f）
sb-test -f test/foo-sb.html test/bar-sb.html
sb-test -f "test/foo-sb.html,test/bar-sb.html"
sb-test -f test/foo-sb.html -f test/bar-sb.html

# 测试指定文件，仅使用 Firefox
sb-test -f test/foo-sb.html -b firefox

# 安装浏览器依赖并运行测试
sb-test --install

# 只同步测试清单
sb-test --generate-only
```

## 测试清单

每次常规运行都会在项目根目录维护一份 `test-index.html` 清单。你完全可以不管它，但也可以随意手动编辑：

```html
<sb-test-suite parallel="4">
  <!-- include 顺序 = 执行顺序 -->
  <include src="./setup.sb.html" exclusive></include>
  <include src="./core/a.sb.html"></include>
  <include src="./core/b.sb.html"></include>
  <include src="./flaky.sb.html" skip></include>
</sb-test-suite>
```

每次运行时清单会与项目的最新扫描结果同步：

- 新增的 `.sb.html` 文件会**追加到 include 列表末尾**（不会打乱你手动排的顺序）。
- 指向已删除文件的条目会被**移除**。
- 你手动修改的一切——顺序、属性、注释——都会**原样保留**。

`<include>` 支持的属性：

| 属性 | 作用 |
|------|------|
| `skip` | 文件保留在清单中但不执行（适合临时停用） |
| `exclusive` | 独占运行：等其他文件全部跑完才启动，它运行期间其他文件也不能启动——适合 setup 文件或需要干净浏览器状态的测试 |

`<sb-test-suite>` 上的 `parallel="n"` 属性控制同时并发运行的文件数。命令行 `-c <n>` 只在显式传入时才会覆盖它，否则以你手动配置的值为准。

> 用 `-f` 临时运行部分文件时会写入临时的 `test-run.html`，不会碰你编排好的清单；运行结束后临时文件自动删除。

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

> **提示**：WebKit 建议在 macOS 上运行以获得完整的浏览器环境支持，例如 Origin Private File System (OPFS) 等 API 在 Linux 环境下可能受限。

## API

### generateTestHtml(rootDir)

同步测试清单（`test-index.html`）：首次运行生成，之后与项目最新扫描结果做“查漏补缺”式同步（新文件追加、失效文件移除、手动编辑保留）。传 `{ force: true }` 可强制重建，传 `{ parallel: 2, parallelExplicit: true }` 可写入 suite 级并发数。

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Manifest: ${result.outputPath}`);
console.log(`Added: ${result.added}, Removed: ${result.removed}`);
```

### generateFilesHtml(rootDir, filePaths, options)

为显式指定的 HTML 文件生成临时清单 `test-run.html` —— 支持多个文件，后缀不限于 `.sb.html`（只要求 `.html`）。不会改动常驻的 `test-index.html`。

```javascript
import { generateFilesHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateFilesHtml('/path/to/project', ['test/foo.sb.html', 'test/bar-sb.html']);
console.log(`Included ${result.fileCount} file(s)`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

运行浏览器测试。

```javascript
import { runTests } from 'sibyl-test/scripts/run-tests.js';

const result = await runTests({
  browsers: ['webkit', 'chrome'],
  port: 30028,
  rootDir: '/path/to/project',
  testHtml: 'test-index.html' // 要打开的清单，默认 test-index.html
});

if (result.success) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}
```

## 工作原理

1. **同步阶段**：CLI 扫描项目中的所有 `.sb.html` 文件并同步 `test-index.html`（首次生成，之后查漏补缺）。`-f` 模式改为生成临时清单 `test-run.html`。

2. **测试阶段**：
   - 启动本地 HTTP 服务器
   - 使用 Playwright（WebKit、Chrome）或 Selenium（Firefox）打开测试页面
   - 等待所有测试完成
   - 收集并显示测试结果

3. **清理阶段**：删除 `-f` 模式产生的临时 `test-run.html`。`test-index.html` 会保留，手动编排跨运行生效。

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

## 与 Playwright/Test 的区别

Playwright/Test 在隐私模式下运行浏览器进行测试，这导致某些浏览器 API 无法使用，例如 Service Worker 和 Origin Private File System。而 Sibyl Test 使用正常模式的浏览器，可以完整访问这些 API。

此外，Playwright/Test 采用 `spec.js` 模式编写测试，需要学习特定的测试语法。Sibyl Test 则使用 HTML 编写测试，无需学习新语法——你甚至不需要了解 CLI 工具，只需在静态服务器下打开 HTML 文件，即可进行测试并查看结果。

Sibyl Test 的 CLI 经过优化，会先将测试用例封装成一个 HTML 文件，然后在浏览器中运行，因此速度比 Playwright/Test 更快。

## 常见问题

### 如何在测试中使用 ES Modules？

只需在 `<script type="module">` 标签内直接使用 `import` 语法引入模块即可，目前暂不支持 `import as` 这种命名空间导入方式。

### 如何测试异步操作？

在测试脚本中使用 `await` 关键字即可测试异步操作。

### 如何跳过某个测试？

可以注释掉整个测试标签来跳过测试。

### 如何运行不想进 CI 的本地测试？

将文件命名为不以 `.sb.html` 结尾（如 `local-sb.html`），默认扫描只会发现 `.sb.html` 文件，因此 `npm test` / CI 不会执行它；需要时用 `sb-test -f local-sb.html` 显式运行（支持多文件）。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

Apache-2.0