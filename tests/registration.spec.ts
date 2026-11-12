import { DashboardPage } from "../pages/dashboard-page";
import { registerUser } from "../pages/flows";
import { RegisterPage, RegisterSetupPage } from "../pages/register-page";
import { isDisplayedWithin } from "../support/datetime";
import { expect, test } from "../support/fixtures";

test.describe("新規登録", () => {
  // E01：ID・パスワード → 認証アプリの設定（キーからコードを計算）で登録でき、ダッシュボードにログイン ID と登録した日時が出る
  test("E01 新規登録", { tag: "@mobile" }, async ({ page, user }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.submit(user.loginId, user.password);

    const setup = new RegisterSetupPage(page);
    await setup.expectOpened();
    await expect(setup.code).toHaveAccessibleDescription(RegisterSetupPage.codeHint);
    const authenticator = await setup.createAuthenticator();
    const code = await authenticator.nextCode();
    const submittedAt = Date.now();
    await setup.submit(code);

    const dashboard = new DashboardPage(page);
    await dashboard.expectOpened();
    await expect(dashboard.loginId).toHaveText(user.loginId);
    const registeredAt = await dashboard.registeredAt.innerText();
    expect(
      isDisplayedWithin(registeredAt, submittedAt, Date.now()),
      `登録した日時「${registeredAt}」が、登録した時刻と合わない`,
    ).toBe(true);
  });

  // E07：登録済みのログイン ID で新規登録すると、お知らせが出て、ログイン ID は残り、パスワードは空になる
  test("E07 ログイン ID が使われている", async ({ page, user }) => {
    await registerUser(page, user);
    await new DashboardPage(page).logout();

    const register = new RegisterPage(page);
    await register.goto();
    // E07 だけは、先に登録した ID をわざと使う
    await register.submit(user.loginId, user.password);

    await register.expectOpened();
    await expect(register.dangerNotice).toHaveText(RegisterPage.notices.loginIdTaken);
    await expect(register.loginId).toHaveValue(user.loginId);
    await expect(register.password).toHaveValue("");
  });

  // E12：スマホでは、認証アプリの設定で「QR コードを読み取れない場合」が最初から開いていて、キーとコピーのボタンが見える
  test("E12 スマホでのキーの表示", { tag: "@mobile-only" }, async ({ page, user }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.submit(user.loginId, user.password);

    const setup = new RegisterSetupPage(page);
    await setup.expectOpened();
    await expect(setup.setupKey).toBeVisible();
    await expect(setup.copyKeyButton).toBeVisible();
  });
});
