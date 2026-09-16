---
name: "sibyl-test"
description: "帮助用户编写和运行基于 Web Components 的 sibyl-test 浏览器测试。当用户需要创建 .sb.html 测试、使用 sb-test/sb-test-suite 组件、运行 CLI 多浏览器测试或配置 GitHub Actions 时调用。"
---

# Sibyl Test 技能

Sibyl Test 是一个轻量、零依赖的浏览器测试框架，基于 Web Components 构建。测试用 HTML 标签编写，可直接在浏览器中运行，也可通过 CLI 在 WebKit、Chrome、Firefox 中自动执行。

## 适用场景

- 需要为 Web 项目编写浏览器端测试
- 需要测试 Service Worker、Origin Private File System 等仅在非隐身模式下可用的 API
- 希望用纯 HTML 而不是 `.spec.js` 编写测试
- 需要在多个浏览器引擎中自动化运行测试

## 核心组件

### `<sb-test>`

单个测试用例组件。

**属性**

- `name`（必填）：测试名称
- `parallel`（可选）：该用例立即并发执行（不进串行队列），适合互相独立的纯计算/异步用例；不加则与其他未标记的用例依次串行执行

**用法示例**

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test.mjs"></script>

<sb-test name="Basic test">
  <template>
    <script>
      return {
        assert: 1 + 1 === 2,
        content: { result: 2 }
      };
    </script>
  </template>
</sb-test>
```

**测试脚本返回值**

```javascript
{
  assert: boolean,  // 断言结果，必须为 true 才算通过
  content: any      // 可选，用于展示额外信息
}
```

**支持的脚本类型**

- 普通 `<script>`：支持 `await` 的异步脚本
- `<script type="module">`：支持 ES Module 导入，支持默认导入、命名导入、命名空间导入和动态导入

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

### `<sb-test-suite>`

测试套件组件，用于组合多个 `.sb.html` 文件。

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test-suite.mjs"></script>

<sb-test-suite parallel="2">
  <include src="./test1.sb.html"></include>
  <include src="./test2.sb.html"></include>
</sb-test-suite>
```

**属性与并发控制**

- `<sb-test-suite parallel="n">`：同时并发运行 n 个文件（iframe），默认 1（串行）
- `<include>` 属性：
  - `skip`：文件保留在清单中但不执行
  - `exclusive`：独占运行——等其他文件全部跑完才启动，运行期间其他文件不能启动（适合 setup 或需要干净浏览器状态的测试）
- include 的书写顺序 = 执行顺序

## 文件约定

- 单个测试文件建议使用 `.sb.html` 扩展名
- 文件可单独在静态服务器打开查看结果
- CLI 将所有 `.sb.html` 收集到项目根目录的测试清单 `test-index.html` 中运行

## 测试清单（test-index.html）

清单首次运行自动生成，之后每次运行自动“查漏补缺”式同步：

- 新增的 `.sb.html` 追加到 include 列表末尾（不打乱手动顺序）
- 已删除文件的条目自动移除
- 手动编辑（顺序、skip、exclusive、parallel、注释）全部保留

可以手动编辑清单控制执行编排：

```html
<sb-test-suite parallel="4">
  <include src="./setup.sb.html" exclusive></include>
  <include src="./core/a.sb.html"></include>
  <include src="./core/b.sb.html"></include>
  <include src="./flaky.sb.html" skip></include>
</sb-test-suite>
```

CLI 的 `-c <n>` 只在显式传入时才覆盖 suite 的 `parallel` 属性；`-f` 临时运行写独立的 `test-run.html`，不动清单。

## CLI 使用

### 安装

```bash
npm install sibyl-test --save-dev
```

### 常用命令

```bash
# 运行所有测试（默认 webkit, chrome, firefox）
npx sb-test

# 指定浏览器
npx sb-test --browsers webkit,chrome

# 并发运行 4 个测试文件
npx sb-test -c 4

# 仅同步 test-index.html
npx sb-test --generate-only

# 仅运行测试（跳过清单同步）
npx sb-test --run-only

# 丢弃清单重新扫描生成
npx sb-test --force-regenerate

# 测试指定文件（支持多个，后缀不限 .sb.html）
npx sb-test -f test/foo.sb.html
npx sb-test -f test/a-sb.html test/b-sb.html

# 安装浏览器依赖
npx sb-test --install
```

### CLI 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-b, --browsers <browsers>` | 浏览器列表，逗号分隔 | `webkit,chrome,firefox` |
| `-p, --port <port>` | 本地测试服务器端口 | `30028` |
| `-t, --timeout <minutes>` | 单个浏览器的测试超时（分钟） | `5` |
| `-c, --concurrency <n>` | 测试文件并发数（同时运行的 iframe 数量） | `1` |
| `-f, --file <paths...>` | 测试指定的 HTML 文件（可多个：空格或逗号分隔，或重复 `-f`；后缀不限于 `.sb.html`） | 全部文件 |
| `--generate-only` | 仅同步测试清单 | `false` |
| `--run-only` | 仅运行测试 | `false` |
| `--force-regenerate` | 丢弃现有清单重新生成 | `false` |
| `--install` | 安装浏览器依赖 | `false` |

### 并发使用建议

- 用例间独立（纯计算、异步、不碰共享 DOM/全局状态）→ 在 `.sb.html` 内给个别 `<sb-test>` 加 `parallel` 属性
- 用例会操作 DOM、全局变量或依赖执行顺序 → 文件级并发：编辑 `test-index.html`，用 `parallel="n"` + `exclusive` 编排，靠 iframe 隔离保证安全

## Node.js API

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';
import { runTests } from 'sibyl-test/scripts/run-tests.js';

// 同步测试清单 test-index.html（首次生成，之后查漏补缺）
const { fileCount, outputPath, added, removed } = generateTestHtml('/path/to/project');

// 运行测试
const result = await runTests({
  browsers: ['webkit', 'chrome'],
  port: 30028,
  rootDir: '/path/to/project',
  testHtml: 'test-index.html' // 默认 test-index.html
});
```

## GitHub Actions

```yaml
name: Browser Tests
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ofajs/sibyl-test@v1
        with:
          browsers: 'webkit,chrome,firefox'
```

> WebKit 建议在 macOS 上运行，以获得完整的浏览器环境支持。

## 编写技巧

### 1. 测试普通 JS 模块

如果测试的是普通 JS 模块，可直接在 `<script type="module">` 中导入并测试：

```html
<sb-test name="Create and Write File">
  <template>
    <script>
      import { init, get } from "/nos/fs/main.js";
      {
        const testDir = await init("testDir2");
        const file1 = await testDir.get("file1.txt", { create: "file" });
        const someText = "Write some text " + Math.random();
        await file1.write(someText);
        const text2 = await file1.text();
        const file1_2 = await get("testDir2/file1.txt");
        const isSame = await file1.isSame(file1_2);

        return {
          assert: someText === text2 && isSame,
          content: someText + " -- " + text2,
        };
      }
    </script>
  </template>
</sb-test>
```

### 2. 测试原生元素或 Web Component

测试原生元素或 Web Component 时，可搭配 [ofa.js](https://ofajs.com/cn/scenarios/ai-skill-usage)，直接在 JS 中获取和操作页面元素：

```html
<head>
  <script src="/gh/ofajs/ofa.js@latest/dist/ofa.mjs#debug" type="module"></script>
  <script type="module" src="https://cdn.jsdelivr.net/gh/ofajs/sibyl-test/components/sb-test.mjs"></script>
</head>

<body>
  <l-m src="./user-name.html"></l-m>
  <div id="query-target"></div>

  <sb-test name="创建测试用户修改名称后用 user-name 显示">
    <template>
      <script type="module">
        {
          const { getUser } = await import("/nos/user/main.js");
          const testUser = await getUser("test-name-user1");
          const targetUserId = testUser.userId;
          await testUser.updateInfo({ username: "测试昵称" });
          const info = await testUser.getInfo();
          const expectedUsername = info.username;

          const container = $("#query-target");
          container.html = `<user-name user-id="${targetUserId}"></user-name>`;
          await new Promise((r) => setTimeout(r, 50));
          const el = container.$("user-name");
          await new Promise((r) => setTimeout(r, 200));
          const afterQuery = el.shadow.$("span").text;

          return {
            assert: afterQuery === expectedUsername,
            content: { targetUserId, expectedUsername, afterQuery },
          };
        }
      </script>
    </template>
  </sb-test>
</body>
```

### 3. 避免变量名重复

同一个 `.sb.html` 文件内的多个 `<sb-test>` 案例共享同一份 HTML 上下文，测试脚本中的变量名不要重复，建议使用带后缀的命名，如 `testDir2`、`_default`、`_update`、`_merge` 等，防止案例之间相互污染。

### 4. 在 content 中暴露断言明细

`assert` 上的复杂判断结果，建议同步反映到 `content` 中，方便测试失败后快速定位是哪一步未通过。可在 `content` 中添加 `checks` 对象列出每个判断项：

```javascript
const hasInfo_default = !!info_default;
const hasUsername_default = !!info_default.username;
const usernameFormatValid_default = info_default.username.startsWith("user-");

return {
  assert: hasInfo_default && hasUsername_default && usernameFormatValid_default,
  content: {
    message: "新用户默认用户名生成测试成功",
    username: info_default.username,
    checks: {
      hasInfo_default,
      hasUsername_default,
      usernameFormatValid_default,
    },
  },
};
```

### 5. 将错误信息也放入 content

如果调试案例中有错误，应尽可能把错误对象或关键上下文反映到 `content` 上，便于在测试报告中定位问题。例如：

```javascript
try {
  const result = await mayThrow();
  return {
    assert: result.ok,
    content: { result },
  };
} catch (error) {
  return {
    assert: false,
    content: {
      error: error.message,
      stack: error.stack,
    },
  };
}
```

## 常见问题

### 如何跳过某个测试？

- 跳过单个用例：将整个 `<sb-test>` 标签注释掉
- 跳过整个文件：在 `test-index.html` 的对应 `<include>` 上加 `skip` 属性（同步时不会被移除）

### 如何测试异步操作？

直接在脚本中使用 `await`：

```html
<sb-test name="Async test">
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

### 与 Playwright/Test 的区别

- Sibyl Test 使用普通浏览器模式，可测试 Service Worker、OPFS 等 API
- 测试用 HTML 编写，无需学习新的 spec 语法
- CLI 先打包测试文件再运行，速度更快
