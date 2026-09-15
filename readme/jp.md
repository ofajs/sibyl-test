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

## クイックスタート

### ブラウザで直接使用

Sibyl Test は CDN を通じて HTML で直接使用でき、インストールは不要です。自動化されたテストを実行するには、ファイル名を `.sb.html` にすることを推奨します（例: `test.sb.html`）。

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

### 常に質問

#### ES Modules をテストで使用するには？

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

#### あるテストをスキップするには？

テスト全体のタグをコメントアウトしてテストをスキップできます。

## CLI ツール（マルチブラウザテスト）

複数のブラウザ（WebKit、Chrome、Firefox）でテストを実行する必要がある場合、このプロセスを自動化するための CLI ツールを提供しています。

このコマンドラインツールは、プロジェクト内のすべての `.sb.html` ファイルをテストマニフェスト（`test-index.html`）に収集し、複数のブラウザエンジンでテストを実行します。マニフェストはプロジェクトに常駐します：初回実行時に自動生成され、以降は自動同期されます——テストの順序、ファイル単位の並列数、スキップを手動で制御できます（[テストマニフェスト](#テストマニフェスト)セクションを参照）。

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

# テストマニフェストのみ同期
npx sb-test --generate-only

# テストのみ実行（マニフェスト同期をスキップ）
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
| `-c, --concurrency <n>` | テストファイルの並列数（同時に実行する iframe 数） | `1` |
| `-f, --file <paths...>` | テストする HTML ファイルを指定（複数可：スペース・カンマ区切り、`-f` の繰り返し；拡張子は `.sb.html` に限定されない） | すべてのファイル |
| `--generate-only` | マニフェストのみ同期し、テストは実行しない | `false` |
| `--run-only` | マニフェスト同期をスキップしてテストのみ実行 | `false` |
| `--force-regenerate` | 既存のマニフェストを破棄して再生成 | `false` |
| `--install` | ブラウザ依存関係をインストール | `false` |

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

# 指定ファイルのみテスト
sb-test -f test/foo.sb.html

# 複数ファイルをテスト（スペース・カンマ区切り、-f の繰り返しも可）
sb-test -f test/foo-sb.html test/bar-sb.html
sb-test -f "test/foo-sb.html,test/bar-sb.html"
sb-test -f test/foo-sb.html -f test/bar-sb.html

# 指定ファイルを Firefox のみでテスト
sb-test -f test/foo-sb.html -b firefox

# テストマニフェストのみ同期
sb-test --generate-only
```

## テストマニフェスト

通常の実行ごとに、プロジェクトルートに `test-index.html` マニフェストが維持されます。触らなくても動作しますが、自由に手動編集できます：

```html
<sb-test-suite parallel="4">
  <!-- include の順序 = 実行順序 -->
  <include src="./setup.sb.html" exclusive></include>
  <include src="./core/a.sb.html"></include>
  <include src="./core/b.sb.html"></include>
  <include src="./flaky.sb.html" skip></include>
</sb-test-suite>
```

実行のたびに、マニフェストは最新のプロジェクトスキャンと同期されます：

- 新しい `.sb.html` ファイルは include リストの**末尾に追加**されます（手動の順序は崩されません）。
- ファイルが存在しなくなったエントリは**削除**されます。
- 手動で編集した内容（順序、属性、コメント）はすべて**そのまま保持**されます。

`<include>` の属性：

| 属性 | 効果 |
|------|------|
| `skip` | ファイルはマニフェストに残るが実行されない（一時的に無効化する場合など） |
| `exclusive` | 単独実行：他のファイルが動いていないときのみ開始し、実行中は他のファイルを開始させない——セットアップファイルやクリーンなブラウザ状態が必要なテストに最適 |

`<sb-test-suite>` の `parallel="n"` 属性で同時に実行するファイル数を制御します。CLI の `-c <n>` は明示的に指定した場合のみ上書きし、それ以外は手動の値が優先されます。

> `-f` で一部のファイルを一時的に実行する場合は、一時ファイル `test-run.html` が生成され、編集済みマニフェストには影響しません。実行終了後、一時ファイルは自動削除されます。

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

> **ヒント**：WebKit は macOS 上で実行することをお勧めします。Origin Private File System (OPFS) などの高度な API は Linux 環境では制限される場合があります。

## API

### generateTestHtml(rootDir)

テストマニフェスト（`test-index.html`）を同期します：初回実行で生成し、以降は最新のプロジェクトスキャンと同期します（新規ファイルは末尾に追加、削除済みファイルは除去、手動編集は保持）。`{ force: true }` で強制再構築、`{ parallel: 2, parallelExplicit: true }` で suite レベルの並列数を書き込めます。

```javascript
import { generateTestHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateTestHtml('/path/to/project');
console.log(`Found ${result.fileCount} test files`);
console.log(`Manifest: ${result.outputPath}`);
console.log(`Added: ${result.added}, Removed: ${result.removed}`);
```

### generateFilesHtml(rootDir, filePaths, options)

明示的に指定した HTML ファイル用の一時マニフェスト `test-run.html` を生成します。複数ファイルに対応し、拡張子は `.sb.html` に限定されません（`.html` であれば OK）。常設の `test-index.html` には影響しません。

```javascript
import { generateFilesHtml } from 'sibyl-test/scripts/generate-test-html.js';

const result = generateFilesHtml('/path/to/project', ['test/foo.sb.html', 'test/bar-sb.html']);
console.log(`Included ${result.fileCount} file(s)`);
console.log(`Generated: ${result.outputPath}`);
```

### runTests(options)

ブラウザテストを実行します。

```javascript
import { runTests } from 'sibyl-test/scripts/run-tests.js';

const result = await runTests({
  browsers: ['webkit', 'chrome'],
  port: 30028,
  rootDir: '/path/to/project',
  testHtml: 'test-index.html' // 開くマニフェスト、デフォルトは test-index.html
});

if (result.success) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}
```

## 動作原理

1. **同期フェーズ**：CLI がプロジェクト内のすべての `.sb.html` ファイルをスキャンし、`test-index.html` を同期します（初回は生成、以降は差分同期）。`-f` 実行では代わりに一時マニフェスト `test-run.html` を生成します。

2. **テストフェーズ**：
   - ローカル HTTP サーバーを起動
   - Playwright（WebKit、Chrome）または Selenium（Firefox）を使用してテストページを開く
   - すべてのテストが完了するのを待機
   - テスト結果を収集して表示

3. **クリーンアップフェーズ**：`-f` 実行で生成された一時 `test-run.html` を削除します。`test-index.html` は保持され、手動のオーケストレーションは実行間で有効です。

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

## 与 Playwright/Test の違い

Playwright/Test はシークレットモードでブラウザを実行するため、Service Worker や Origin Private File System などの特定のブラウザ API にアクセスできません。Sibyl Test は通常のブラウザモードを使用するため、これらの API に完全にアクセス可能です。

さらに、Playwright/Test は `spec.js` モードを使用するため、特定のテスト構文を学ぶ必要があります。Sibyl Test は HTML を使用してテストを記述するため、新しい構文を学ぶ必要がありません。CLI ツールを理解する必要さえなく、単に静的サーバーで HTML ファイルを開くだけでテストを実行し、結果を確認できます。

Sibyl Test の CLI はテストケースを HTML ファイルにパッケージ化してからブラウザで実行するため、Playwright/Test よりも高速です。

## 常に質問

### ES Modules をテストで使用するには？

`<script type="module">` タグ内で直接 `import` を使用できます。ただし、`import * as` のような名前空間インポートは現在サポートされていません。

### 非同期操作をテストするには？

テストスクリプト内で `await` キーワードを使用して非同期操作をテストできます。

### あるテストをスキップするには？

テスト全体のタグをコメントアウトしてテストをスキップできます。

## 貢献

Issue や Pull Request を歓迎します！

## ライセンス

Apache-2.0
