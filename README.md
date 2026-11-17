# yosing-sandbox-e2e

sandbox アプリの E2E テスト（Playwright・TypeScript）のリポジトリです。

デプロイした環境で、ブラウザー・web（画面と BFF）・API・DB までを通して、利用者の操作どおりに動作することを検証します。

| リポジトリ | 内容 |
| :--- | :--- |
| [yosing-sandbox-web](https://github.com/yosing-global/yosing-sandbox-web) | 画面と BFF（Next.js） |
| [yosing-sandbox-api](https://github.com/yosing-global/yosing-sandbox-api) | API（Spring Boot） |

## 範囲

テストの役割を分担し、E2E では利用者の操作の流れと、画面に表示される文言・画面遷移を検証します。

| 検証すること | 担当 |
| :--- | :--- |
| 利用者の操作の流れ（登録・ログイン・ログアウト）、画面に表示される文言、画面遷移 | E2E（このリポジトリ） |
| API の細かな判定（入力ルールの境界値・有効期限・ロックの回数の数え方） | api の結合テスト |
| 画面部品の状態ごとの表示 | web の単体テスト・画面モック（Storybook） |
| レイアウト（配置・崩れ） | 目視（画面モックと実際の画面） |

- E2E で検証しないもの：時間のかかる確認（仮登録の10分・仮認証の5分・セッションの12時間の有効期限切れ）、サーバーエラー（`INTERNAL_ERROR`）、メンテナンス中のページ。

## 構成

| 場所 | 内容 |
| :--- | :--- |
| `tests/` | シナリオ（E01〜E12）。機能分類ごとに1ファイル（下記「シナリオ」を参照） |
| `pages/` | 画面ごとの部品（Page Object）。文言（設計資料から転記）と操作をまとめる。`flows.ts` は登録・ログインの流れ |
| `support/` | TOTP の計算・次の30秒の周期を待つ処理（`totp.ts`）、テストデータ（`test-data.ts`）、fixture（`fixtures.ts`）。単体テストは `*.test.ts` |
| `playwright.config.ts` | E2E の設定：対象の URL（環境変数）、端末（PC・スマホ）、再試行・記録の設定 |
| `playwright.unit.config.ts` | `support/` の単体テストの設定（`npm run test:unit`）。E2E とは分け、`npx playwright test` では実行されない |
| `.github/workflows/` | web・api の CI から呼び出す再利用可能なワークフロー（`e2e.yml`）、このリポジトリの PR の静的チェック（`pr.yml`）、develop への同期（`sync-develop.yml`） |

## シナリオ

ID は利用者の操作の流れの順に付けています（ファイルの分け方とは独立。新しいシナリオは E13 から続けます）。テスト名は `<ID> <シナリオ>` の形式です（例：`npx playwright test -g E08` で1件だけ実行できます）。

| ID | シナリオ | 検証すること | 端末 |
| :--- | :--- | :--- | :--- |
| E01 | 新規登録 | ID・パスワード → 認証アプリの設定（キーからコードを計算）→ ダッシュボードにログイン ID と登録日時が表示される | PC・スマホ |
| E02 | ログアウト | ログイン画面に戻る。ブラウザーの戻るボタンでダッシュボードを開いても、ログイン画面になる | PC・スマホ |
| E03 | ログイン | ID・パスワード → 認証コード → ダッシュボード | PC・スマホ |
| E04 | 入力形式のエラー | ログイン・新規登録で、入力欄の下にルールの文言が表示される（送信しない） | PC |
| E05 | ID かパスワードが違う | 「ログイン ID かパスワードが違います。」が表示される。ログイン ID は残り、パスワードは空になる | PC |
| E06 | コードが違う | ログインのステップ2で「コードが違います。もう一度入力してください。」が表示される | PC |
| E07 | ログイン ID が使用済み | 登録済みの ID で新規登録すると「このログイン ID は使われています。別の ID にしてください。」が表示される | PC |
| E08 | コードの入力ミスが続いた場合 | コードを5回間違えると、ステップ1に戻り「しばらく時間をおいてから、もう一度ログインしてください。」が表示される | PC |
| E09 | 別のタブでログインを開始 | 2つ目のブラウザーでログインを開始すると、1つ目のステップ2の送信で「ログインの有効期限が切れました。もう一度ログインしてください。」が表示される | PC |
| E10 | 未ログインでダッシュボードを開く | ログイン画面に戻る | PC |
| E11 | 存在しない URL | 「ページが見つかりません」が表示される | PC |
| E12 | スマホでのキーの表示 | 認証アプリの設定で「QR コードを読み取れない場合」が最初から開いている | スマホ |

テストファイルは、機能分類ごとに1つです。

| 機能分類 | ファイル | シナリオ |
| :--- | :--- | :--- |
| 新規登録 | `tests/registration.spec.ts` | E01、E07、E12 |
| ログイン | `tests/login.spec.ts` | E03、E05、E06、E08、E09 |
| ログアウト・未ログイン | `tests/session.spec.ts` | E02、E10 |
| 入力形式のエラー | `tests/validation.spec.ts` | E04 |
| 存在しない URL | `tests/not-found.spec.ts` | E11 |

## 実装方針

- **画面の部品は、画面の文言で特定する**：ボタン・リンク・見出しはロールと文言（`getByRole`）、入力欄はラベル（`getByLabel`）、お知らせはロール（`alert` / `status`）で取得し、全文を検証します。文言は UI/UX 設計で定めた仕様のため、変更された場合はテストが失敗するのが正しい動きです。`data-testid` は、いずれの方法でも特定できない場合にだけ使います。
- **文言は、設計資料から転記する**：画面ごとの部品（`pages/`）に、設計資料の文言を転記します。web のコードの文言は読み込みません（web の誤りを、E2E が同じ誤りのまま通してしまうため）。
- **TOTP のコードは、テストで計算する**：認証アプリの代わりに、登録画面の「QR コードを読み取れない場合」に表示されるキーから計算します（SHA1・6桁・30秒）。一度使ったコードは再利用できないため、ログインの前に次の30秒の周期に切り替わるまで待ちます。
- **ユーザーは、テストごとに画面から登録して作成する**：テスト間で共有しません。ログイン ID は `e2e_dummy_` ＋ 時刻 ＋ 乱数（25文字）で、ほかの実行と重複しません。パスワードは `dummy` を含む固定の文字列です。
- **作成したユーザーは、テストの中では削除しない**：dev・test・stg のテーブルに蓄積され、api の CI（develop・main へのマージ）が、登録から24時間を過ぎた `e2e_dummy_` のユーザーを削除します。
- **ログ・成果物に、パスワード・コード・キー・セッション ID・Cookie を出力しない。**

## 端末

| プロジェクト | ブラウザー | 画面サイズ | 対象のテスト |
| :--- | :--- | :--- | :--- |
| `pc` | Chromium | 1280×800 | タグ `@mobile-only` 以外 |
| `mobile` | Chromium（タッチ操作あり） | 390×844 | タグ `@mobile`・`@mobile-only` |

- タグのないテストは PC でのみ実行します。スマホでも実行するテストには `@mobile`、スマホだけで実行するテストには `@mobile-only` を付けます。

## ローカルでの実行

### 準備（初回のみ）

Node.js 24 を使います（`.nvmrc`）。

```powershell
npm ci
npx playwright install chromium
```

### ローカルで起動した web・api に対して実行する

1. api のリポジトリで、DynamoDB Local と API を起動します（手順は [api の README](https://github.com/yosing-global/yosing-sandbox-api#ローカルでの開発) を参照）。

2. web のリポジトリで、web をビルドして本番モードで起動します（`http://localhost:3000`。ローカルの API を呼び出します）。

   ```powershell
   npm ci
   npm run build
   $env:API_BASE_URL = "http://localhost:8080"
   $env:APP_ENV = "local"
   npx next start -p 3000
   ```

   - `npm run dev`（開発モード）では実行しないでください。ブラウザーが HMR に接続するたびにページの再読み込み（`HMR hash mismatch`）が繰り返され、画面遷移やメモリ上の値が失われてテストが失敗します。
   - web のコードを変更した場合は、ビルドし直します。

3. このリポジトリで、テストを実行します。

   ```powershell
   npm test -- --workers=1
   ```

   - ローカルの web に対して複数のテストを並列で実行すると、web が 10〜20秒応答しなくなり、テストが失敗することがあります。dev（AWS）では並列でも問題が起きないため、ローカル環境（Windows）に限った事象です。ローカルでは `--workers=1` で1件ずつ実行します。

### デプロイした環境に対して実行する

SSM のポートフォワーディングで接続したうえで（手順は web の Wiki の「環境別接続手順」を参照）、`E2E_BASE_URL` に対象の環境の URL を指定します。

```powershell
$env:E2E_BASE_URL = "https://dev.local.sandbox.yosing.net:8090"
npm test
```

- nonprod のタスクは通常は停止しており、使用するときに起動します（毎日 3:00 JST に停止）。停止中は 502 になります。
- stg に対して実行する場合は、`E2E_BASE_URL` に `https://stg.sandbox.yosing.net` を指定し、Basic 認証の `E2E_HTTP_USERNAME`・`E2E_HTTP_PASSWORD` も指定します（SSM のポートフォワーディングは不要です）。

### 環境変数

| 名前 | 内容 | 既定値 |
| :--- | :--- | :--- |
| `E2E_BASE_URL` | 対象の環境の URL | `http://localhost:3000` |
| `E2E_HTTP_USERNAME`・`E2E_HTTP_PASSWORD` | 入口の Basic 認証（stg のみ）。指定した場合はトレースを記録しない（通信のヘッダーにパスワードが残るため） | なし |
| `CI` | CI で実行する場合（再試行1回・`test.only` の禁止） | なし |

## コマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm test` | E2E（PC・スマホ）。部品の単体テストは含まない |
| `npm run test:unit` | `support/` の部品の単体テスト（`playwright.unit.config.ts`。ブラウザー・対象の環境を使わない） |
| `npm run test:pc` / `npm run test:mobile` | 端末を絞って実行 |
| `npm run report` | 前回の結果のレポートを表示 |
| `npm run check` | フォーマットの確認・ESLint・型チェック・テストの一覧（PR で実行するものと同じ） |
| `npm run format` | フォーマットの適用 |

## 失敗した場合

- 失敗したテストについてのみ、トレースとスクリーンショットを `test-results/` に保存します。`npx playwright show-trace <trace.zip>` で開けます。
- CI では、HTML のレポート（トレース・スクリーンショットを含む）を、呼び出し元のリポジトリの Actions の成果物 `e2e-report-<環境>-<試行回数>` として7日間保存します。

## CI からの呼び出し（`e2e.yml`）

web・api の CI の `deploy → verify` の後に、再利用可能なワークフローとして呼び出します。デプロイした環境に接続し、`/api/health` の応答を待ってから実行します。接続方法は、対象の環境の SSM パラメータで決まります（公開 URL があればその URL（stg。Basic 認証も付与）、なければ SSM のポートフォワーディング（nonprod））。CI では、失敗したテストを1回だけ再試行します。

| トリガー | 対象の環境 | 呼び出し元 | 参照する E2E のブランチ |
| :--- | :--- | :--- | :--- |
| web の PR | web の PR 環境 `pr<番号>`（API は dev） | web | `develop` |
| web・api の `develop` へのマージ | test | web・api | `develop` |
| `main` へのマージ | stg | web・api | `main` |

- api の PR では E2E を実行しません（api の変更は、develop へのマージ後に test の E2E で確認します）。
- test では、web と api の両方の CI が E2E を実行します。両者の間で排他制御をしていないため、相手のデプロイ中に実行されると失敗することがあります。その場合は再実行します（自動で1回再試行し、それでも失敗した場合は手動で Re-run）。

```yaml
e2e:
  needs: deploy
  uses: yosing-global/yosing-sandbox-e2e/.github/workflows/e2e.yml@develop
  permissions:
    contents: read
    id-token: write
  with:
    app_env: pr${{ github.event.pull_request.number }}
    e2e_ref: develop
  secrets:
    aws_role_arn: ${{ secrets.AWS_ROLE_ARN }}
```

| 入力 | 内容 |
| :--- | :--- |
| `app_env` | 対象の環境（`dev` / `test` / `pr<番号>` / `stg`）。prod では実行しない |
| `e2e_ref` | テストのコードを取得するブランチ。`uses` の `@` の後ろと同じにする |
| `aws_role_arn`（secret） | 呼び出し元の CI ロールの ARN。呼び出し元の Secrets `AWS_ROLE_ARN`（stg は `AWS_ROLE_ARN_STG`）を、**`secrets:` 側に**指定して渡す（secret の値はログで最初からマスクされる。`with:` で渡すと、マスクする前のステップに元の値が出力される） |

- 参照するブランチは、対象の環境にデプロイされている web のバージョンに合わせます：PR 環境・dev・test は `develop`、stg は `main`。
- 呼び出し元のジョブには `environment:` を付けません（OIDC の `sub` が変わり、CI ロールを引き受けられなくなるため）。
- 対象の環境のタスクが停止していると、ヘルスチェックで失敗します（インフラのリポジトリ（非公開）の起動のワークフローで起動してから、再実行します）。
