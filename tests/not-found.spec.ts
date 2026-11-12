import { NotFoundPage } from "../pages/not-found-page";
import { expect, test } from "../support/fixtures";

test.describe("存在しない URL", () => {
  // E11：存在しない URL を開くと、404 で「ページが見つかりません」の画面が出る
  test("E11 存在しない URL", async ({ page }) => {
    const response = await page.goto("/no-such-page");

    expect(response?.status()).toBe(404);
    await new NotFoundPage(page).expectOpened();
  });
});
