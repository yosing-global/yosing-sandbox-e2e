import { defineConfig } from "@playwright/test";

// support/ の部品の単体テスト（ブラウザーも対象の環境も使わない）
//   E2E（playwright.config.ts）とは設定を分ける。npx playwright test で単体テストが動かないように
//   動かすのは npm run test:unit（このリポジトリの PR の pr.yml でも動かす）
export default defineConfig({
  testDir: "./support",
  testMatch: "**/*.test.ts",
  // CI で test.only が残っていたら落とす
  forbidOnly: !!process.env.CI,
  reporter: "list",
});
