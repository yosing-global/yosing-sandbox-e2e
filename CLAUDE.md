# CLAUDE.md

sandbox の E2E テストのリポジトリ。Playwright（TypeScript）。sandbox は個人の学習とポートフォリオを兼ねたプロダクトで、最初の範囲は TOTP 認証（登録・ログイン）と、認証後のダッシュボード・ログアウト。画面と BFF は `yosing-sandbox-web`（Next.js）、API は `yosing-sandbox-api`（Spring Boot）。

## 状況（2026-11-12 時点）

- 手順 1〜5 は済み。シナリオ E01〜E12 が、手元（`--workers=1`）と dev（SSM。4つ並べても）で全部通る。次は手順 6。
- E2E の設計は Notion の「6. テスト仕様」の「yosing-sandbox-e2e E2Eテスト」が正（Notion MCP で検索できる）。要点は下の「設計の要点」。
- 作業の手順（web のリポジトリで整理した）：

| # | 作業 | 成果 |
| :--- | :--- | :--- |
| 1 | 設計の書き足し（Notion。済み） | 設計が今の web と合う |
| 2 | 土台（済み）：Playwright・TypeScript・ESLint（Playwright の推奨ルール）・Prettier、`playwright.config.ts`（URL は環境変数。PC・スマホ）、README、自身の PR の静的チェック（`.github/workflows`） | 手元で `npx playwright test` が動く |
| 3 | 部品（`support/`。済み）：TOTP の計算・次の30秒を待つ部品・ログイン ID を作る部品（fixture）。単体テスト付き | テストのデータと認証コードを作れる |
| 4 | 画面ごとの部品（`pages/`。済み）：ログイン・新規登録・ダッシュボード・404。文言と操作をまとめる | シナリオから使える |
| 5 | シナリオ E01〜E12（済み）。まず手元（web・api を手元で起動）で通し、次に dev へ SSM でつないで通す | 手元と dev で全部通る |
| 6 | 再利用できるワークフロー `e2e.yml`（SSM でつなぐ・1回だけやり直す・失敗の記録を残す。作成済み。動かして確かめるのは 7） | web・api から呼べる |
| 7 | web の CI に `e2e` のジョブを足す（`pr.yml` は PR 環境、`develop.yml` は test）。e2e を読む GitHub App（作成・登録済み） | web の PR で E2E が動く |
| 8 | test 環境のロック（`aws-infra-env` に DynamoDB のテーブルと権限）、api の `develop.yml` に `e2e` と `cleanup`（テストのユーザーの掃除） | develop へのマージで test に E2E が流れる |
| 9 | Wiki・README に E2E のことを書く（e2e・web・api） | 説明がそろう |

- 手順 2〜5 はこのリポジトリだけで進める。CI（6 以降）とは PR を分ける。
- 手順 6 の `e2e.yml` は、呼ぶ側（web）が無いと動かせない。6 は静的チェックまでで develop に入れ、7 の web の PR で初めて動かして直す。
- E2E の後は、stg / prod のインフラと各アプリの CI の仕上げ。リポジトリ・Wiki の一般公開は、全部を確かめた後の最後。
- E2E で見つかった web の問題（web のリポジトリで直す。7 より前に直したい）：
  - スマホで「ダッシュボード → ログアウト → ログイン → 同じタブでダッシュボード」と進むと、まれに React の誤り #185（Maximum update depth exceeded）でエラーの画面になる（手元で1回。dev では 28回流して起きていない）。隠れた画面を出し直す部品（`UnmountWhenHidden`・`ResetWhenHidden`・スマホのメニュー）の、layout effect の中の状態の変更が怪しい。
  - `npm run dev` では、ブラウザーが HMR につながるたびに `HMR hash mismatch` でページが読み直され続ける（Next.js 16.4.5）。16.4.6 で直るかを確かめる。
- 手元の web に、いくつものテストを並べて動かすと、web が 10〜20秒止まることがある（CPU は使っていない。dev では起きない）。手元の Windows の環境に限ったものとして、手元では `--workers=1` で動かす。

## 公開の範囲

- 公開するのは、アプリのリポジトリ（web・api・e2e）とその Wiki。インフラのリポジトリ（`aws-infra-*`）は非公開のまま。Notion は非公開（最後に公開用の1ページを作り、README からリンクする）。
- このリポジトリは、一般公開まで非公開（2026-11-10 に決定）。web・api の CI からは次の2つで使う。
  - このリポジトリの設定（Settings → Actions → Access）で、同じ organization のリポジトリからワークフローを使えるようにする。
  - コードの取り込みは、e2e を読む GitHub App（organization の App。このリポジトリだけにインストールし、権限は Contents の読み取りだけ。2026-11-12 に作成）。`e2e.yml` の中で `actions/create-github-app-token` により1時間だけ使えるトークンを作り、`actions/checkout` に渡す。web・api には、Variables に `E2E_APP_CLIENT_ID`、Secrets に `E2E_APP_PRIVATE_KEY` を置く。
  - デプロイキーは使わない（organization のポリシーで使えないうえ、GitHub も App を勧めている。鍵に期限が無い）。
- 一般公開するときの片づけ：web・api のワークフローの `e2e_app_client_id`・`e2e_app_private_key` の行を消す → web・api の Variables・Secrets から `E2E_APP_CLIENT_ID`・`E2E_APP_PRIVATE_KEY` を消す → GitHub App をアンインストールして消す（`e2e.yml` は、App の情報が無ければトークン無しで取ってくる）。
- 公開する前提で書く：ファイル・コメント・ログに、アカウント ID・ロールの ARN・秘密の値を書かない。

## 設計の要点（詳細は Notion）

### 範囲

- デプロイした環境で、ブラウザー・web・BFF・API・DB をつなげて、利用者の操作どおりに動くことを確かめる。
- API の細かな判定（境界値・期限・ロックの回数の数え方）は api の結合テスト。時間がかかる確認（期限切れ）、`INTERNAL_ERROR`、メンテナンス中のページは E2E で行わない。
- レイアウト（配置・崩れ）は E2E で確かめない（Storybook と実際の画面を人の目で）。

### シナリオ

| ID | 機能分類 | シナリオ | 確かめること | 端末 |
| :--- | :--- | :--- | :--- | :--- |
| E01 | 新規登録 | 新規登録 | ID・パスワード → 認証アプリの設定（キーからコードを計算）→ ダッシュボードにログイン ID と登録した日時 | PC・スマホ |
| E02 | ログアウト・未ログイン | ログアウト | ログイン画面に戻る。戻るボタンでダッシュボードを開いても、ログイン画面になる | PC・スマホ |
| E03 | ログイン | ログイン | ID・パスワード → 認証コード → ダッシュボード | PC・スマホ |
| E04 | 入力の形式の誤り | 入力の形式の誤り | ログイン・新規登録で、入力欄の下に規則の文言（送信しない） | PC |
| E05 | ログイン | ID かパスワードが違う | 「ログイン ID かパスワードが違います。」。ログイン ID は残り、パスワードは空 | PC |
| E06 | ログイン | コードが違う | ログインのステップ2で「コードが違います。もう一度入力してください。」 | PC |
| E07 | 新規登録 | ログイン ID が使われている | 「このログイン ID は使われています。別の ID にしてください。」 | PC |
| E08 | ログイン | コードの誤りが続いた後 | 5回間違えるとステップ1に戻り「しばらく時間をおいてから、もう一度ログインしてください。」（15分ロックされるため専用のユーザー） | PC |
| E09 | ログイン | 別のタブでログインを始めた | 2つ目のブラウザーでログインを始めると、1つ目のステップ2の送信で、ログイン画面に「ログインの有効期限が切れました。もう一度ログインしてください。」 | PC |
| E10 | ログアウト・未ログイン | 未ログインでダッシュボードを開く | ログイン画面に戻る | PC |
| E11 | 存在しない URL | 存在しない URL | 「ページが見つかりません」 | PC |
| E12 | 新規登録 | スマホでのキーの表示 | 認証アプリの設定で「QR コードを読み取れない場合」が最初から開いている | スマホ |

- ID は Notion の表の順（利用者の流れの順）。ファイルの分け方とは切り離す（作りを変えても ID は変えない）。新しいシナリオは、続きの番号（E13〜）を振る。
- 機能分類1つにつき、テストのファイルを1つにする。テストの `describe` の名前は機能分類の名前、テストの名前は `<ID> <シナリオ>` にする（`npx playwright test -g E08` で1件だけ動かせる）。

| 機能分類 | ファイル |
| :--- | :--- |
| 新規登録 | `tests/registration.spec.ts` |
| ログイン | `tests/login.spec.ts` |
| ログアウト・未ログイン | `tests/session.spec.ts` |
| 入力の形式の誤り | `tests/validation.spec.ts` |
| 存在しない URL | `tests/not-found.spec.ts` |

### TOTP のコード

- テストが認証アプリの代わりにコードを計算する（ライブラリ。SHA1・6桁・30秒）。
- キーは、登録の画面の「QR コードを読み取れない場合」に出る文字（`aria-label="セットアップキー"`）から読む。QR コードの画像は読まない。
- 一度使ったコードは使えない（登録の直後に同じ30秒でログインすると `OTP_INVALID`）。ログインの前に、次の30秒に変わるまで待つ部品を使う。
- 30秒の境目の直前（残り2秒未満）なら、次の30秒を待ってから計算する。

### テストのデータ

- ユーザーは、テストごとに画面から新規登録して作る（テストどうしで共有しない）。
- ログイン ID：`e2e_dummy_` ＋ 時刻（36進数で9文字）＋ 乱数（36進数で6文字）＝25文字。小文字・数字・`_` だけ。テストごとの fixture の中で作る（ファイルの読み込み時や `beforeAll` では作らない）。固定の ID をテストに書かない。
- `LOGIN_ID_TAKEN` が出ても、別の ID で黙ってやり直さない（E07 だけは、先に登録した ID をわざと使う）。
- パスワード：`dummy` を含む決まった文字列（本物でないと分かるように）。
- 作ったユーザーはテストの中では消さない。溜まったものは api の CI の `cleanup` で消す（手順 8）。

### 画面の部品の探し方

- 方針：画面の文言で探す（文言は UI/UX 設計で決めた仕様なので、変わったらテストも落ちるのが正しい）。
  - ボタン・リンク・見出し：`getByRole(…, { name })`。入力欄：`getByLabel`。お知らせ：役割（`alert` 赤 / `status` 青）を取って文言を確かめる。入力欄の下の誤り：`toHaveAccessibleDescription`（`aria-describedby`）。
  - `getByText` は役割の無い文だけ。短い文言は `exact: true`。`data-testid` は、どれでも探せないときだけ。
- 文言は、Notion の「4.1 UI/UX設計」から、画面ごとの部品（Page Object）に書き写す。web の `src/shared/messages.ts` を読み込まない（web の誤りを E2E が同じ誤りのまま通してしまうため）。文言を変えるときは 4.1 → E2E → web の順。
- 確かめる文言：見出し（`h1`）とタブのタイトル、お知らせ（全文が一致）、入力欄の下の誤り、「コードは30秒ごとに変わります」、ダッシュボードの値（ログイン ID・登録した日時）、エラーの画面の見出し。
- 確かめない文言：見出しの下の説明文、入力欄の下の案内、仮置きの機能のメニュー・カード、飾り。
- **web の離れた画面は消えずに隠れて残る**（Next.js の Cache Components）。
  - `getByLabel` は隠れた入力欄にも当たる。見えているものに絞る：`page.getByLabel("ログイン ID").filter({ visible: true })`。`getByRole` は隠れた要素を除くので、そのままでよい。
  - Next.js の画面の移動を読み上げる部品（`next-route-announcer`、shadow DOM の中）も `role="alert"` を持つ。お知らせは `main` の中で探す：`page.getByRole("main").getByRole("alert")`（`locator("main")` は隠れて残る画面の `main` にも当たるため、`getByRole` を使う）。
- web で付けた名前：

| 部品 | 名前 |
| :--- | :--- |
| セットアップキー | `aria-label="セットアップキー"` |
| キーのコピー | 「キーをコピー」（PC の見た目は「コピー」） |
| QR コード | 代替テキスト「認証アプリの設定用の QR コード」 |
| パスワードの表示の切り替え | 「パスワードを表示」 |
| スマホのメニュー | 「メニューを開く」「メニューを閉じる」 |
| ステップ表示の今のステップ | `aria-current="step"` |

- タブのタイトル（`<画面の名前> | sandbox`）：

| URL | タイトル |
| :--- | :--- |
| `/login` | ログイン \| sandbox |
| `/login/verify` | 認証コードの入力 \| sandbox |
| `/register` | 新規登録 \| sandbox |
| `/register/setup` | 認証アプリの設定 \| sandbox |
| `/dashboard` | ホーム \| sandbox |
| エラー（500） | エラー \| sandbox |
| 存在しない URL | ページが見つかりません \| sandbox |

### web の画面の動き（E2E に関わるもの）

- URL：`/login`（ステップ1）→ `/login/verify`（ステップ2）、`/register`（ステップ1）→ `/register/setup`（ステップ2）、`/dashboard`。`/` は、ログイン中なら `/dashboard`、そうでなければ `/login`。
- `/register/setup` の設定の値はブラウザーのメモリにだけある。リロード・URL の直打ちでは `/register` に戻る。
- お知らせ付きの移動は URL に理由が付く（`/login?notice=expired`・`retry-later`、`/register?notice=restart`・`taken`）。
- Cookie：セッション `__Host-session`（`Path=/`）、仮認証 `__Secure-login`（`Path=/login`）。どちらも `HttpOnly`・`Secure`・`SameSite=Lax`。
- ヘルスチェック：`/api/health`（`{"status":"UP"}`）。

### 端末

- PC：Chromium、1280×800。スマホ：Chromium、390×844（タッチ操作あり）。WebKit は使わない。
- スマホでは E01〜E03・E12 だけ。

### 環境と接続

| 契機 | 対象の環境 | 呼ぶ側 | 呼ぶ E2E |
| :--- | :--- | :--- | :--- |
| web の PR | web の PR 環境 `pr<番号>`（API は dev） | web | develop |
| web・api の develop へのマージ | test | web・api | develop |
| main へのマージ | stg（インフラ未作成。CloudFront の公開の入口から開く） | web・api | main |

- nonprod の URL は `https://<env>.local.sandbox.yosing.net:8090`（DNS は 127.0.0.1 を返す）。GitHub のランナー・手元から、SSM のポートフォワーディング（手元の 8090 → リバースプロキシの 443）でつなぐ。手順は web の Wiki の「環境別接続手順」、CI での作りは api・web の `.github/workflows/_deploy.yml` の `verify`（SSM でつないで `/api/health` を待つ）が手本。
- 証明書の誤りを無視する設定は使わない。
- nonprod の稼働時間は毎日 9:00〜翌 1:00（JST）。外の時間は 502。
- 手元：web（`http://localhost:3000`）は手元の API（`http://localhost:8080`）を呼ぶ。API は api のリポジトリで `docker compose up -d` → `.\gradlew.bat bootRun --args='--spring.profiles.active=local'`、web は `npm ci` → `npm run build` → 環境変数 `API_BASE_URL=http://localhost:8080`・`APP_ENV=local` を付けて `npx next start -p 3000`（本番モード）。`npm run dev` では、HMR のつなぎ直しのたびにページの読み直し（`HMR hash mismatch`）が繰り返され、E2E が落ちる（Next.js 16.4.5 で確認）。

### CI からの呼び出し

- このリポジトリに再利用できるワークフロー（`workflow_call`）を置く。入力は対象の環境。web・api の CI の `deploy → verify` の後ろに `e2e` のジョブを足して呼ぶ。
- 呼ぶ側は、対象の環境にデプロイされている web の版に合わせて参照する（E2E のシナリオは、その環境の web と合っている必要があるため）：PR 環境・dev・test は `@develop`、stg は `@main`（上の表の「呼ぶ E2E」）。api の CI も、同じ環境の web を相手にするので同じ参照にする。
- `e2e.yml` は、テストのコードを、呼ばれたのと同じブランチの最新から取ってくる（ワークフローとテストのコードの版をそろえる。CI の Re-run でも、マージした後の新しいシナリオが使われるように）。
- マージの順のずれで stg の E2E が落ちたときは、相手側をマージしてから流し直す。ずれている間は stg の E2E が赤のままで、本当の不具合を見逃しやすいので、ずれる時間を短くする（下の「git」の決まり）。
- AWS への認証は、呼ぶ側の CI ロール（`github-actions-sandbox-web-role` / `-api-role`）。OIDC の `sub` が呼ぶ側の契機になるため。SSM のポートフォワーディングの権限は、両方の CI ロールに付いている（`aws-infra-env` の `products/sandbox/nonprod/iam.tf`）。ジョブに `environment:` を付けない（`sub` が変わる）。
- ロールの ARN（アカウント ID を含む）は、呼ぶ側の Variables の値を、`e2e.yml` の **secret** として渡す（`secrets:` の側に書く）。secret の値はログで最初から伏せられる。入力（`with:`）や Variables のまま使うと、`::add-mask::` を行うステップ自身の `env:` の表示に元の値が出る（2026-11-12 に web の PR の実行で起きた）。アカウント ID だけの値は、`e2e.yml` の最初のステップで `::add-mask::` で伏せる。
- test 環境の排他：デプロイから E2E の終わりまでを、web と api の間で直列にする（DynamoDB の条件付き書き込みのロック、期限付き）。テーブルと権限は `aws-infra-env` に足す。
- このリポジトリ自身の PR では、静的チェック（整形・ESLint・型チェック・テストの一覧）、`support/` の単体テスト、ワークフローの書き方の確認（actionlint）だけを動かす（AWS にはつながない）。
- 失敗したら、1回だけやり直す（CI のみ）。
- 失敗したとき、トレースとスクリーンショットを成果物に残す（7日）。成果物とログは、呼ぶ側のリポジトリに残る。ログにパスワード・コード・キーを出さない。
- 動画はふだん撮らない。デモ動画は、web の側に置く手動のワークフロー（`workflow_dispatch`）で撮る。

### リポジトリの作り

| 場所 | 内容 |
| :--- | :--- |
| `tests/` | シナリオ（`login.spec.ts`・`registration.spec.ts` 等）。テストには、何を確かめるかを1文で書いたコメントを付ける |
| `pages/` | 画面ごとの部品（Page Object）。文言と操作をまとめる |
| `support/` | TOTP の計算・次の30秒を待つ部品、テストのデータを作る部品 |
| `playwright.config.ts` | 対象の URL（環境変数で渡す）、端末（PC・スマホ）、やり直し・記録の設定 |
| `.github/workflows/` | 再利用できるワークフロー（`e2e.yml`。入力は `app_env`・`e2e_ref`・`e2e_app_client_id`、secret は `aws_role_arn`・`e2e_app_private_key`）、自身の PR の静的チェック（`pr.yml`） |

- 言語は TypeScript。Node.js 24（web とそろえる）。

## 関連リポジトリ（`../` に clone 済み）

| リポジトリ | 内容 |
| :--- | :--- |
| `yosing-sandbox-web` | 画面と BFF。画面の作りの決まり（E2E が部品を探すための決まり）は、その CLAUDE.md の「画面の作りの決まり」。Wiki（`../yosing-sandbox-web.wiki`）に画面の仕様と動作確認の手順 |
| `yosing-sandbox-api` | API。仕様は GitHub Wiki（`../yosing-sandbox-api.wiki`） |
| `aws-infra-env` | 環境のインフラ。CI ロールの権限（`products/sandbox/nonprod/iam.tf`）、リバースプロキシ。README の「sandbox（nonprod）」が正 |
| `aws-infra-global` | ECR、アプリの CI ロールの信頼ポリシー、DNS |

## 設計（Notion）

「4.1 UI/UX設計」（文言の正）、「4.2 画面のURLとBFF」、「4.3 API設計」、「6. テスト仕様」の「yosing-sandbox-e2e E2Eテスト」（E2E の設計）。テストのケースを足す・変えたら、E2E の設計のページも直す。

## git

- ブランチは main・develop・作業ブランチ（2026-11-12 に develop を足すと決定）。web・api と同じく、develop ＝ 次に出るもの（PR 環境・dev・test の E2E が使う）、main ＝ 出ているもの（stg の E2E が使う）。
- 作業ごとに `origin/develop` から新しいブランチを作り、作った後に `git branch --unset-upstream` を実行する。PR は develop に向けて出す。
- web・api と対になる変更（文言・部品の名前・新しい機能のシナリオ等）は、相手の develop と同じ時期に develop にマージする。どちらを先にするかは、PR の「関連 PR」に書く。
- web を main に出すときは、e2e も develop → main に出す。web と対になる変更が develop に残ったまま、e2e だけを先に main に出さない。
- stg の E2E だけを急いで直すときは、main から作業ブランチを作って main に直し、develop にも戻す（web・api の hotfix と同じ）。
- コミットはユーザーの承認を得てから。メッセージは日本語で `feat:` / `fix:` / `docs:` 等で始め、最後に `Co-Authored-By` の行を付ける。
- push・マージはユーザーが行う（Claude は push しない）。

## 作業の進め方

- やり取り・コードのコメント・ドキュメントは日本語。
- AWS のリソースを変える操作（作成・削除）は、CI 経由かユーザーの確認のうえで行う。
- Norton の TLS 検査で、Claude のシェルからの通信（npm・Playwright のブラウザーのダウンロード、AWS CLI 等）が証明書のエラーで失敗することがある。その場合は、ユーザーに PowerShell で実行してもらうコマンドを示す（`AWS_CA_BUNDLE` は使わない）。
- 画面の作りが E2E で探しにくい（ラベルが無い等）ときは、E2E で回避せず、web の側を直す。API の仕様の問題は api のリポジトリで直す。
- テストのログ・成果物に、パスワード・コード・キー・セッション ID・Cookie を出さない。
