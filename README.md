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
| `tests/` | シナリオ（E01〜E12）。機能分類ごとに1ファイル（下の「シナリオ」） |
| `pages/` | 画面ごとの部品（Page Object）。文言（Notion の「4.1 UI/UX設計」から書き写す）と操作をまとめる。`flows.ts` は登録・ログインの流れ |
| `support/` | TOTP の計算・次の30秒を待つ部品（`totp.ts`）、テストのデータ（`test-data.ts`）、fixture（`fixtures.ts`）。単体テストは `*.test.ts` |
| `playwright.config.ts` | 対象の URL（環境変数）、端末（PC・スマホ）、やり直し・記録の設定 |
| `.github/workflows/` | このリポジトリの PR の静的チェック（`pr.yml`） |

## シナリオ

シナリオの一覧（確かめること）は、Notion の E2E の設計が正。ID はその表の順に振り、ファイルは機能分類ごとに分ける。テストの名前は `<ID> <シナリオ>`（例：`npx playwright test -g E08` で1件だけ動かせる）。

| 機能分類 | ファイル | シナリオ |
| :--- | :--- | :--- |
| 新規登録 | `tests/registration.spec.ts` | E01 新規登録、E07 ログイン ID が使われている、E12 スマホでのキーの表示 |
| ログイン | `tests/login.spec.ts` | E03 ログイン、E05 ID かパスワードが違う、E06 コードが違う、E08 コードの誤りが続いた後、E09 別のタブでログインを始めた |
| ログアウト・未ログイン | `tests/session.spec.ts` | E02 ログアウト、E10 未ログインでダッシュボードを開く |
| 入力の形式の誤り | `tests/validation.spec.ts` | E04 入力の形式の誤り |
| 存在しない URL | `tests/not-found.spec.ts` | E11 存在しない URL |

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
   npm test -- --workers=1
   ```

   - 手元の web に、いくつものテストを並べて動かすと、web が 10〜20秒止まり、テストが落ちることがある。dev（AWS）では並べても止まらないため、手元の環境（Windows）に限ったもの。手元では `--workers=1` で1つずつ動かす。

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
