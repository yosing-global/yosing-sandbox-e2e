import { DashboardPage } from "../pages/dashboard-page";
import { registerUser } from "../pages/flows";
import { LoginPage } from "../pages/login-page";
import { test } from "../support/fixtures";

test.describe("ログアウト・未ログイン", () => {
  // E02：ログアウトするとログイン画面に戻り、ブラウザーの戻るでダッシュボードを開いてもログイン画面になる
  test("E02 ログアウト", { tag: "@mobile" }, async ({ page, user }) => {
    await registerUser(page, user);

    await new DashboardPage(page).logout();
    const login = new LoginPage(page);
    await login.expectOpened();

    await page.goBack();
    await login.expectOpened();
  });

  // E10：ログインしていないときにダッシュボードを開くと、ログイン画面になる
  test("E10 未ログインでダッシュボードを開く", async ({ page }) => {
    await new DashboardPage(page).goto();

    await new LoginPage(page).expectOpened();
  });
});
