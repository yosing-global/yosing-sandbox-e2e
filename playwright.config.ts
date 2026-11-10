import { defineConfig, devices } from "@playwright/test";

// 対象の環境の URL。CI では呼ぶ側が渡す（例：https://dev.local.sandbox.yosing.net:8090）
//   渡さないときは、手元で起動した web（npm run dev）を開く
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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
    // 失敗したテストだけ、トレースとスクリーンショットを残す。動画はふだん撮らない
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // 証明書の誤りは無視しない（ignoreHTTPSErrors を付けない）
  },
  // 端末。テストの対象は、テストのタグで決める
  //   タグ無し       ：PC だけ（E04〜E11）
  //   @mobile        ：PC とスマホ（E01〜E03）
  //   @mobile-only   ：スマホだけ（E12）
  projects: [
    // support/ の部品の単体テスト（ブラウザーも対象の環境も使わない）
    {
      name: "unit",
      testDir: "./support",
      testMatch: "**/*.test.ts",
    },
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
