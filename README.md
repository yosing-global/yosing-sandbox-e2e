# yosing-sandbox-e2e

sandbox アプリの E2E テスト（Playwright・TypeScript）。

デプロイした環境で、ブラウザー・web（画面と BFF）・API・DB をつなげて、利用者の操作どおりに動くことを確かめる。

| リポジトリ | 内容 |
| :--- | :--- |
| `yosing-sandbox-web` | 画面と BFF（Next.js） |
| `yosing-sandbox-api` | API（Spring Boot） |

## 範囲

テストの役割を分けて、E2E は利用者の流れと、画面に出る文言・画面の移動を確かめる。

| 確かめること | どこで |
| :--- | :--- |
| 利用者の流れ（登録・ログイン・ログアウト）、画面に出る文言、画面の移動 | E2E（このリポジトリ） |
| API の細かな判定（入力の規則の境界値・期限・ロックの回数の数え方） | api の結合テスト |
| 画面の部品の状態ごとの表示 | web の単体テスト・画面モック（Storybook） |
| レイアウト（配置・崩れ） | 人の目（画面モックと実際の画面） |

- E2E で確かめないもの：時間がかかる確認（仮登録の10分・仮認証の5分・セッションの12時間の期限切れ）、サーバーの誤り（`INTERNAL_ERROR`）、メンテナンス中のページ。

## 構成

| 場所 | 内容 |
| :--- | :--- |
| `tests/` | シナリオ（E01〜E12）。機能分類ごとに1ファイル（下の「シナリオ」） |
| `pages/` | 画面ごとの部品（Page Object）。文言（Notion の「4.1 UI/UX設計」から書き写す）と操作をまとめる。`flows.ts` は登録・ログインの流れ |
| `support/` | TOTP の計算・次の30秒を待つ部品（`totp.ts`）、テストのデータ（`test-data.ts`）、fixture（`fixtures.ts`）。単体テストは `*.test.ts` |
| `playwright.config.ts` | E2E の設定：対象の URL（環境変数）、端末（PC・スマホ）、やり直し・記録の設定 |
| `playwright.unit.config.ts` | `support/` の単体テストの設定（`npm run test:unit`）。E2E と分けて、`npx playwright test` では動かない |
| `.github/workflows/` | web・api の CI から呼ぶ再利用できるワークフロー（`e2e.yml`）、このリポジトリの PR の静的チェック（`pr.yml`） |

## シナリオ

ID は利用者の流れの順に振る（ファイルの分け方とは切り離す。新しいシナリオは E13 から続ける）。テストの名前は `<ID> <シナリオ>`（例：`npx playwright test -g E08` で1件だけ動かせる）。

| ID | シナリオ | 確かめること | 端末 |
| :--- | :--- | :--- | :--- |
| E01 | 新規登録 | ID・パスワード → 認証アプリの設定（キーからコードを計算）→ ダッシュボードにログイン ID と登録した日時が出る | PC・スマホ |
| E02 | ログアウト | ログイン画面に戻る。戻るボタンでダッシュボードを開いても、ログイン画面になる | PC・スマホ |
| E03 | ログイン | ID・パスワード → 認証コード → ダッシュボード | PC・スマホ |
| E04 | 入力の形式の誤り | ログイン・新規登録で、入力欄の下に規則の文言が出る（送信しない） | PC |
| E05 | ID かパスワードが違う | 「ログイン ID かパスワードが違います。」が出る。ログイン ID は残り、パスワードは空になる | PC |
| E06 | コードが違う | ログインのステップ2で「コードが違います。もう一度入力してください。」が出る | PC |
| E07 | ログイン ID が使われている | 登録済みの ID で新規登録すると「このログイン ID は使われています。別の ID にしてください。」が出る | PC |
| E08 | コードの誤りが続いた後 | コードを5回間違えると、ステップ1に戻り「しばらく時間をおいてから、もう一度ログインしてください。」が出る | PC |
| E09 | 別のタブでログインを始めた | 2つ目のブラウザーでログインを始めると、1つ目のステップ2の送信で「ログインの有効期限が切れました。もう一度ログインしてください。」が出る | PC |
| E10 | 未ログインでダッシュボードを開く | ログイン画面に戻る | PC |
| E11 | 存在しない URL | 「ページが見つかりません」が出る | PC |
| E12 | スマホでのキーの表示 | 認証アプリの設定で「QR コードを読み取れない場合」が最初から開いている | スマホ |

テストのファイルは、機能分類ごとに1つ。

| 機能分類 | ファイル | シナリオ |
| :--- | :--- | :--- |
| 新規登録 | `tests/registration.spec.ts` | E01、E07、E12 |
| ログイン | `tests/login.spec.ts` | E03、E05、E06、E08、E09 |
| ログアウト・未ログイン | `tests/session.spec.ts` | E02、E10 |
| 入力の形式の誤り | `tests/validation.spec.ts` | E04 |
| 存在しない URL | `tests/not-found.spec.ts` | E11 |

## 作りの方針

- **画面の部品は、画面の文言で探す**：ボタン・リンク・見出しは役割と文言（`getByRole`）、入力欄はラベル（`getByLabel`）、お知らせは役割（`alert` / `status`）を取って全文を確かめる。文言は UI/UX の設計で決めた仕様なので、変わったらテストも落ちるのが正しい。`data-testid` は、どれでも探せないときだけ使う。
- **文言は、設計から書き写す**：画面ごとの部品（`pages/`）に、設計の文言を書き写す。web のコードの文言を読み込まない（web の誤りを、E2E が同じ誤りのまま通してしまうため）。
- **TOTP のコードは、テストが計算する**：認証アプリの代わりに、登録の画面の「QR コードを読み取れない場合」に出るキーから計算する（SHA1・6桁・30秒）。一度使ったコードは使えないため、ログインの前に次の30秒に変わるまで待つ。
- **ユーザーは、テストごとに画面から登録して作る**：テストどうしで共有しない。ログイン ID は `e2e_dummy_` ＋ 時刻 ＋ 乱数（25文字）で、ほかの実行と重ならない。パスワードは `dummy` を含む決まった文字列。
- **作ったユーザーは、テストの中では消さない**：dev・test のテーブルに溜まり、api の CI（develop へのマージ）が、登録から24時間を過ぎた `e2e_dummy_` のユーザーを消す。
- **ログ・成果物に、パスワード・コード・キー・セッション ID・Cookie を出さない。**

## 端末

| プロジェクト | ブラウザー | 画面 | 対象のテスト |
| :--- | :--- | :--- | :--- |
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

- nonprod のタスクは、ふだんは止めておき、使うときに起動する（毎日 3:00 JST に止まる）。止まっていると 502 になる。
- stg に流すときは、`E2E_BASE_URL` に `https://stg.sandbox.yosing.net` を渡し、Basic 認証の `E2E_HTTP_USERNAME`・`E2E_HTTP_PASSWORD` も渡す（SSM のポートフォワーディングは要らない）。

### 環境変数

| 名前 | 内容 | 既定 |
| :--- | :--- | :--- |
| `E2E_BASE_URL` | 対象の環境の URL | `http://localhost:3000` |
| `E2E_HTTP_USERNAME`・`E2E_HTTP_PASSWORD` | 入口の Basic 認証（stg だけ）。渡すと、トレースを取らない（通信のヘッダーにパスワードが残るため） | 無し |
| `CI` | CI で動かすとき（やり直し1回・`test.only` の禁止） | 無し |

## コマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm test` | E2E（PC・スマホ）。部品の単体テストは含まない |
| `npm run test:unit` | `support/` の部品の単体テスト（`playwright.unit.config.ts`。ブラウザー・対象の環境を使わない） |
| `npm run test:pc` / `npm run test:mobile` | 端末を絞って動かす |
| `npm run report` | 前回の結果のレポートを開く |
| `npm run check` | 整形の確認・ESLint・型チェック・テストの一覧（PR で動かすものと同じ） |
| `npm run format` | 整形 |

## 失敗したとき

- 失敗したテストだけ、トレースとスクリーンショットを `test-results/` に残す。`npx playwright show-trace <trace.zip>` で開く。
- CI では、HTML のレポート（トレース・スクリーンショットを含む）を、呼ぶ側のリポジトリの Actions の成果物 `e2e-report-<環境>-<試行の回数>` に7日残す。

## CI から呼ぶ（`e2e.yml`）

web・api の CI の `deploy → verify` の後ろで、再利用できるワークフローとして呼ぶ。デプロイした環境につなぎ、`/api/health` を待ってから流す。つなぎ方は、対象の環境の SSM パラメータで決まる（公開の URL があれば、その URL（stg。Basic 認証も付ける）、無ければ SSM のポートフォワーディング（nonprod））。CI では、失敗したテストを1回だけやり直す。

| 契機 | 対象の環境 | 呼ぶ側 | 参照する E2E |
| :--- | :--- | :--- | :--- |
| web の PR | web の PR 環境 `pr<番号>`（API は dev） | web | `develop` |
| web・api の `develop` へのマージ | test | web・api | `develop` |
| `main` へのマージ | stg | web・api | `main` |

- api の PR では E2E を流さない（api の変更は、develop へのマージの後の test の E2E で確かめる）。
- test は、web と api の CI の両方が流す。両者の間で排他しないため、相手のデプロイの最中に流れて落ちることがある。そのときは流し直す（自動のやり直し1回、それでも落ちたら手で Re-run）。

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
    e2e_app_client_id: ${{ vars.E2E_APP_CLIENT_ID }}
  secrets:
    aws_role_arn: ${{ secrets.AWS_ROLE_ARN }}
    e2e_app_private_key: ${{ secrets.E2E_APP_PRIVATE_KEY }}
```

| 入力 | 内容 |
| :--- | :--- |
| `app_env` | 対象の環境（`dev` / `test` / `pr<番号>` / `stg`）。prod には流さない |
| `e2e_ref` | テストのコードを取ってくるブランチ。`uses` の `@` の後ろと同じにする |
| `aws_role_arn`（secret） | 呼ぶ側の CI ロールの ARN。値は呼ぶ側の Secrets `AWS_ROLE_ARN`（stg は `AWS_ROLE_ARN_STG`）を、**`secrets:` の側に**書いて渡す（secret の値はログで最初から伏せられる。`with:` で渡すと、伏せる前のステップに元の値が出る） |
| `e2e_app_client_id` | このリポジトリを読む GitHub App の Client ID（呼ぶ側の Variables `E2E_APP_CLIENT_ID` から渡す）。このリポジトリを一般公開した後は要らない |
| `e2e_app_private_key`（secret） | 同じ App の秘密鍵（呼ぶ側の Secrets `E2E_APP_PRIVATE_KEY`）。このリポジトリを一般公開した後は要らない |

- このリポジトリは非公開のため、呼ぶ側のトークンでは読めない。`e2e.yml` の中で、App の秘密鍵から「このリポジトリの中身を読むだけ」のトークン（1時間で切れる）を作って取ってくる。

- 参照するブランチは、対象の環境にデプロイされている web の版に合わせる：PR 環境・dev・test は `develop`、stg は `main`。
- 呼ぶ側のジョブに `environment:` を付けない（OIDC の `sub` が変わり、CI ロールに入れなくなる）。
- 対象の環境のタスクが止まっていると、ヘルスチェックで落ちる（aws-infra-env の start で起動してから、流し直す）。
