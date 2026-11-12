import { DashboardPage } from "../pages/dashboard-page";
import { registerUser } from "../pages/flows";
import { LoginPage, LoginVerifyPage } from "../pages/login-page";
import { expect, test } from "../support/fixtures";

// どのテストも、画面から登録したユーザーでログアウトしてから始める
test.describe("ログイン", () => {
  // E03：ID・パスワード → 認証コードでログインでき、ダッシュボードに自分のログイン ID が出る
  test("E03 ログイン", { tag: "@mobile" }, async ({ page, user }) => {
    const authenticator = await registerUser(page, user);
    await new DashboardPage(page).logout();

    const login = new LoginPage(page);
    await login.expectOpened();
    await login.submit(user.loginId, user.password);

    const verify = new LoginVerifyPage(page);
    await verify.expectOpened();
    await expect(verify.code).toHaveAccessibleDescription(LoginVerifyPage.codeHint);
    // 登録で使ったコードと同じ30秒のコードは使えないため、次の30秒まで待つことがある
    await verify.submit(await authenticator.nextCode());

    const dashboard = new DashboardPage(page);
    await dashboard.expectOpened();
    await expect(dashboard.loginId).toHaveText(user.loginId);
  });

  // E05：パスワードが違うと、お知らせが出て、ログイン ID は残り、パスワードは空になる
  test("E05 ID かパスワードが違う", async ({ page, user }) => {
    await registerUser(page, user);
    await new DashboardPage(page).logout();

    const login = new LoginPage(page);
    await login.submit(user.loginId, `${user.password}-wrong`);

    await login.expectOpened();
    await expect(login.dangerNotice).toHaveText(LoginPage.notices.invalidCredentials);
    await expect(login.loginId).toHaveValue(user.loginId);
    await expect(login.password).toHaveValue("");
  });

  // E06：ステップ2でコードが違うと、お知らせが出て、入力欄が空に戻る
  test("E06 コードが違う", async ({ page, user }) => {
    const authenticator = await registerUser(page, user);
    await new DashboardPage(page).logout();
    await new LoginPage(page).submit(user.loginId, user.password);

    const verify = new LoginVerifyPage(page);
    await verify.expectOpened();
    await verify.submit(authenticator.wrongCode());

    await verify.expectOpened();
    await expect(verify.dangerNotice).toHaveText(LoginVerifyPage.notices.otpInvalid);
    await expect(verify.code).toHaveValue("");
  });

  // E08：コードを5回続けて間違えると、ステップ1に戻り、時間をおくようお知らせが出る
  //   このユーザーは15分ロックされる（テストごとに新しいユーザーなので、ほかのテストに影響しない）
  test("E08 コードの誤りが続いた後", async ({ page, user }) => {
    const authenticator = await registerUser(page, user);
    await new DashboardPage(page).logout();
    await new LoginPage(page).submit(user.loginId, user.password);

    const verify = new LoginVerifyPage(page);
    await verify.expectOpened();
    for (let attempt = 1; attempt <= 4; attempt++) {
      await verify.submit(authenticator.wrongCode());
      await expect(verify.dangerNotice).toHaveText(LoginVerifyPage.notices.otpInvalid);
    }
    await verify.submit(authenticator.wrongCode());

    const login = new LoginPage(page);
    await login.expectOpened();
    await expect(login.dangerNotice).toHaveText(LoginPage.notices.retryLater);
    await expect(login.loginId).toHaveValue("");
    await expect(login.password).toHaveValue("");
  });

  // E09：別のブラウザーでログインを始めると、先に始めた方のステップ2の送信で、ログイン画面に期限切れのお知らせが出る
  test("E09 別のタブでログインを始めた", async ({ page, user, browser }) => {
    const authenticator = await registerUser(page, user);
    await new DashboardPage(page).logout();
    await new LoginPage(page).submit(user.loginId, user.password);
    const firstVerify = new LoginVerifyPage(page);
    await firstVerify.expectOpened();

    // 2つ目のブラウザー（Cookie を共有しない）で、同じユーザーのログインを始める
    const secondContext = await browser.newContext();
    try {
      const secondLogin = new LoginPage(await secondContext.newPage());
      await secondLogin.goto();
      await secondLogin.submit(user.loginId, user.password);
      await new LoginVerifyPage(secondLogin.page).expectOpened();
    } finally {
      await secondContext.close();
    }

    await firstVerify.submit(await authenticator.nextCode());

    const login = new LoginPage(page);
    await login.expectOpened();
    await expect(login.infoNotice).toHaveText(LoginPage.notices.expired);
  });
});
