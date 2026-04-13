# Sibyl Test

[中文版](./cn.md) | [English](../README.md)

Web Components で構築された軽量で依存関係のないブラウザテストフレームワーク。

## 特徴

- 🚀 **ゼロ依存** - コアコンポーネントはインストール不要で、ブラウザで直接動作します
- 🧩 **Web Components** - Web Components で構築されており、任意のフレームワークで使用可能
- 📝 **シンプルで直感的** - HTML タグでテストを記述し、直感的かつ明確
- ⚡ **並列テスト** - 並列テスト実行をサポートし、テスト効率を向上
- 🌐 **マルチブラウザ対応** - WebKit、Chrome、Firefox など複数のブラウザをサポート
- 🔓 **非シークレットモード** - 通常のブラウザモードを使用し、Service Worker や Origin Private File System などの高度な API をテスト可能
- 🔧 **CLI ツール** - 開発ワークフローへの簡単な統合のためのコマンドラインツール
- 🤖 **CI/CD サポート** - シームレスな CI/CD 統合のための GitHub Action

## Playwright/Test との違い

Playwright/Test はシークレットモードでブラウザを実行するため、Service Worker や Origin Private File System などの特定のブラウザ API にアクセスできません。Sibyl Test は通常のブラウザモードを使用するため、これらの API に完全にアクセス可能です。

さらに、Playwright/Test は `spec.js` モードを使用するため、特定のテスト構文を学ぶ必要があります。Sibyl Test は HTML を使用してテストを記述するため、新しい構文を学ぶ必要がありません。CLI ツールを理解する必要さえなく、単に静的サーバーで HTML ファイルを開くだけでテストを実行し、結果を確認できます。

## クイックスタート

### ブラウザで直接使用

Sibyl Test は CDN を通じて HTML で直接使用でき、インストールは不要です。

`test.sb.html` などの HTML ファイルを作成します：

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

### sb-test コンポーネント

個別のテストケースを記述するための単一テストコンポーネント。

#### 属性

- `name` - テスト名（必須）
- `parallel` - 並列実行するかどうか（オプション）

#### 戻り値

テストスクリプトはオブジェクトを返す必要があります：

```javascript
{
  assert: boolean,  // テストが合格するかどうか
  content: any      // オプション、テスト結果の内容
}
```

#### 例

```html
<!-- 基本テスト -->
<sb-test name="Basic test">
  <template>
    <script>
      return {
        assert: true
      };
    </script>
  </template>
</sb-test>

<!-- 並列テスト -->
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

<!-- 非同期テスト -->
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

### sb-test-suite コンポーネント

複数のテストファイルを組み合わせるためのテストスイートコンポーネント。

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

### よくある質問

#### テストで ES Modules を使用するには？

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

#### 非同期操作をテストするには？

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

## CLI ツール（マルチブラウザテスト）

複数のブラウザ（WebKit、Chrome、Firefox）でテストを実行する必要がある場合、このプロセスを自動化するための CLI ツールを提供しています。

### インストール

```bash
npm install sibyl-test --save-dev
```

### 基本的な使用方法

```bash
# すべてのテストを実行（デフォルトでは webkit、chrome、firefox を使用）
npx sb-test

# ブラウザを指定
npx sb-test --browsers webkit,chrome

# テストファイルのみ生成
npx sb-test --generate-only

# テストのみ実行（生成なし）
npx sb-test --run-only

# ブラウザ依存関係をインストール
npx sb-test --install
```

### npm スクリプトの使用

`package.json` に追加：

```json
{
  "scripts": {
    "test": "sb-test"
  }
}
```

その後、実行：

```bash
npm test
```

### CLI オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-b, --browsers <browsers>` | テストするブラウザ（カンマ区切り） | `webkit,chrome,firefox` |
| `-p, --port <port>` | テストサーバーのポート | `30028` |
| `--generate-only` | テストファイルのみ生成 | `false` |
| `--run-only` | テストのみ実行 | `false` |
| `--install` | ブラウザ依存関係をインストール | `false` |
| `--keep-test-file` | 生成されたテストファイルを保持 | `false` |

### 例

```bash
# すべてのブラウザでテストを実行
sb-test

# WebKit のみでテスト
sb-test --browsers webkit

# Chrome と Firefox でテスト
sb-test --browsers chrome,firefox

# ブラウザ依存関係をインストールしてテストを実行
sb-test --install

# テストファイルのみ生成
sb-test --generate-only
```

## GitHub Actions 統合

### 事前定義されたアクションの使用

プロジェクトに `.github/workflows/test.yml` を作成：

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

### カスタム設定

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

テスト HTML ファイルを生成します。

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

ブラウザテストを実行します。

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

## 動作原理

1. **生成フェーズ**：CLI ツールがプロジェクト内のすべての `.sb.html` ファイルをスキャンし、すべてのテストを含む `test-all.html` ファイルを生成します。

2. **テストフェーズ**：
   - ローカル HTTP サーバーを起動
   - Playwright（WebKit、Chrome）または Selenium（Firefox）を使用してテストページを開く
   - すべてのテストが完了するのを待機
   - テスト結果を収集して表示

3. **クリーンアップフェーズ**：生成された `test-all.html` ファイルを削除（`--no-cleanup` オプションを使用しない場合）

## サンプルプロジェクト

`examples/` ディレクトリでさらに使用例を確認できます：

- [test-examples.sb.html](examples/test-examples.sb.html) - 基本テストの例
- [test-parallel.sb.html](examples/test-parallel.sb.html) - 並列テストの例
- [all.html](examples/all.html) - テストスイートの例

## ブラウザサポート

- WebKit (Safari)
- Chrome / Chromium
- Firefox

## 依存関係

### コアコンポーネント（ブラウザ側）

ゼロ依存！コアコンポーネントはネイティブの Web Components で構築されており、ブラウザで直接使用可能です。

### CLI ツール（Node.js 側）

- `playwright` - WebKit と Chrome テストに使用
- `selenium-webdriver` - Firefox テストに使用
- `http-server` - ローカルテストサーバー
- `commander` - CLI 引数解析

## 貢献

Issue や Pull Request を歓迎します！

## ライセンス

Apache-2.0
