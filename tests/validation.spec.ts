import { FIELD_ERRORS } from "../pages/common";
import { DashboardPage } from "../pages/dashboard-page";
import { registerUser } from "../pages/flows";
import { LoginPage, LoginVerifyPage } from "../pages/login-page";
import { RegisterPage } from "../pages/register-page";
import { expect, test } from "../support/fixtures";

// E04：入力の形式の誤りは、送信せずに、入力欄の下に規則の文言が出る
//   送信しないので、送信の応答を待つ submit ではなく、ボタンを押すだけにする
test.describe("入力の形式の誤り", () => {
  // ログインのステップ1：空のまま「次へ」を押すと、両方の入力欄の下に規則が出て、画面は移らない
  test("E04 ログイン：空のまま次へ", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.nextButton.click();

    await expect(login.loginId).toHaveAccessibleDescription(FIELD_ERRORS.loginId);
    await expect(login.password).toHaveAccessibleDescription(FIELD_ERRORS.password);
    await login.expectOpened();
  });

  // 新規登録のステップ1：規則に合わない値で「次へ」を押すと、両方の入力欄の下に規則が出て、画面は移らない
  test("E04 新規登録：規則に合わない値で次へ", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.loginId.fill("ab");
    await register.password.fill("short");
    await register.nextButton.click();

    await expect(register.loginId).toHaveAccessibleDescription(FIELD_ERRORS.loginId);
    await expect(register.password).toHaveAccessibleDescription(FIELD_ERRORS.password);
    await register.expectOpened();
  });

  // ログインのステップ2：数字6桁でないコードで「ログイン」を押すと、入力欄の下に規則が出て、画面は移らない
  test("E04 ログイン：コードが数字6桁でない", async ({ page, user }) => {
    await registerUser(page, user);
    await new DashboardPage(page).logout();
    await new LoginPage(page).submit(user.loginId, user.password);

    const verify = new LoginVerifyPage(page);
    await verify.expectOpened();
    await verify.code.fill("12a");
    await verify.loginButton.click();

    await expect(verify.code).toHaveAccessibleDescription(FIELD_ERRORS.code);
    await verify.expectOpened();
  });
});
