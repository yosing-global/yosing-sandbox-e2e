# yosing-sandbox-e2e

sandbox アプリの E2E テスト（Playwright・TypeScript）。

デプロイした環境で、ブラウザー・web（画面と BFF）・API・DB をつなげて、利用者の操作どおりに動くことを確かめる。

| リポジトリ | 内容 |
| :--- | :--- |
| `yosing-sandbox-web` | 画面と BFF（Next.js） |
| `yosing-sandbox-api` | API（Spring Boot） |

## 構成

| 場所 | 内容 |
| :--- | :--- |
| `tests/` | シナリオ |
| `pages/` | 画面ごとの部品（Page Object）。文言と操作をまとめる |
| `support/` | TOTP の計算・次の30秒を待つ部品（`totp.ts`）、テストのデータ（`test-data.ts`）、fixture（`fixtures.ts`）。単体テストは `*.test.ts` |
| `playwright.config.ts` | 対象の URL（環境変数）、端末（PC・スマホ）、やり直し・記録の設定 |
| `.github/workflows/` | このリポジトリの PR の静的チェック（`pr.yml`） |

## 端末

| プロジェクト | ブラウザー | 画面 | 対象のテスト |
| :--- | :--- | :--- | :--- |
| `unit` | 使わない | — | `support/**/*.test.ts` |
| `pc` | Chromium | 1280×800 | タグ `@mobile-only` 以外 |
| `mobile` | Chromium（タッチ操作あり） | 390×844 | タグ `@mobile`・`@mobile-only` |

- タグ無しのテストは PC だけで動く。スマホでも動かすテストには `@mobile`、スマホだけのテストには `@mobile-only` を付ける。

## 手元での実行

### 準備（最初の1回）

Node.js 24 を使う（`.nvmrc`）。

```powershell
npm ci
npx playwright install chromium
```

### 手元で起動した web・api に対して動かす

1. api のリポジトリで、DB と API を起動する。

   ```powershell
   docker compose up -d
   .\gradlew.bat bootRun --args='--spring.profiles.active=local'
   ```

2. web のリポジトリで、web をビルドして本番モードで起動する（`http://localhost:3000`。手元の API を呼ぶ）。

   ```powershell
   npm ci
   npm run build
   $env:API_BASE_URL = "http://localhost:8080"
   $env:APP_ENV = "local"
   npx next start -p 3000
   ```

   - `npm run dev`（開発モード）では動かさない。ブラウザーが HMR につながるたびにページの読み直し（`HMR hash mismatch`）が繰り返され、画面の移動やメモリの値が消えてテストが落ちる。
   - web のコードを変えたら、ビルドし直す。

3. このリポジトリで、テストを動かす。

   ```powershell
   npm test
   ```

### デプロイした環境に対して動かす

SSM のポートフォワーディングでつないだうえで（手順は web の Wiki の「環境別接続手順」）、`E2E_BASE_URL` に対象の環境の URL を渡す。

```powershell
$env:E2E_BASE_URL = "https://dev.local.sandbox.yosing.net:8090"
npm test
```

- nonprod の稼働時間は毎日 9:00〜翌 1:00（JST）。外の時間は 502 になる。

### 環境変数

| 名前 | 内容 | 既定 |
| :--- | :--- | :--- |
| `E2E_BASE_URL` | 対象の環境の URL | `http://localhost:3000` |
| `CI` | CI で動かすとき（やり直し1回・`test.only` の禁止） | 無し |

## コマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm test` | 全部のテスト（部品の単体テスト・PC・スマホ） |
| `npm run test:unit` | `support/` の部品の単体テスト（ブラウザー・対象の環境を使わない） |
| `npm run test:pc` / `npm run test:mobile` | 端末を絞って動かす |
| `npm run report` | 前回の結果のレポートを開く |
| `npm run check` | 整形の確認・ESLint・型チェック・テストの一覧（PR で動かすものと同じ） |
| `npm run format` | 整形 |

## 失敗したとき

- 失敗したテストだけ、トレースとスクリーンショットを `test-results/` に残す。`npx playwright show-trace <trace.zip>` で開く。
