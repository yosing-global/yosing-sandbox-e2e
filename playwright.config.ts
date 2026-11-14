import { defineConfig, devices } from "@playwright/test";

// 対象の環境の URL。CI では e2e.yml が渡す（例：https://dev.local.sandbox.yosing.net:8090、https://stg.sandbox.yosing.net）
//   渡さないときは、手元で起動した web（npm run dev）を開く
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// 入口の Basic 認証（stg だけ）。CI では e2e.yml が SSM から読んで渡す。手元で stg に流すときは、自分で環境変数に入れる
//   ブラウザーの画面と、request（API を直接呼ぶテスト）の両方に付く
const httpUsername = process.env.E2E_HTTP_USERNAME;
const httpPassword = process.env.E2E_HTTP_PASSWORD;
const httpCredentials =
  httpUsername && httpPassword ? { username: httpUsername, password: httpPassword } : undefined;

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  // TOTP の「次の30秒を待つ」があるため、1つのテストで最大30秒ほど待つことがある
  timeout: 90_000,
  // CI で test.only が残っていたら落とす
  forbidOnly: isCI,
  // 失敗したら1回だけやり直す（CI のみ。手元ではすぐに失敗を見る）
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"], ["html"]],
  use: {
    baseURL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    httpCredentials,
    // 失敗したテストだけ、トレースとスクリーンショットを残す。動画はふだん撮らない
    //   Basic 認証を付けるとき（stg）は、トレースを取らない（通信のヘッダーに Authorization（パスワード）が残り、
    //   成果物は呼ぶ側のリポジトリ（いずれ公開）に残るため）。スクリーンショットだけにする
    trace: httpCredentials ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // 証明書の誤りは無視しない（ignoreHTTPSErrors を付けない）
  },
  // 端末。テストの対象は、テストのタグで決める
  //   タグ無し       ：PC だけ（E04〜E11）
  //   @mobile        ：PC とスマホ（E01〜E03）
  //   @mobile-only   ：スマホだけ（E12）
  //   support/ の部品の単体テストは、別の設定（playwright.unit.config.ts）で動かす
  //   （npx playwright test は E2E だけ。CI から呼ぶ e2e.yml でも、単体テストを動かさないように）
  projects: [
    {
      name: "pc",
      grepInvert: /@mobile-only/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile",
      grep: /@mobile/,
      use: {
        // Chromium で動くスマホの設定（タッチ操作あり）を元に、画面の大きさだけ変える
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
