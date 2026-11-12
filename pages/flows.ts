import type { Page } from "@playwright/test";
import type { TestUser } from "../support/fixtures";
import type { Authenticator } from "../support/totp";
import { DashboardPage } from "./dashboard-page";
import { LoginPage, LoginVerifyPage } from "./login-page";
import { RegisterPage, RegisterSetupPage } from "./register-page";

// 何度も使う流れ（シナリオの前準備で使う）

/**
 * 画面から新規登録して、ダッシュボードまで進む
 * 返す Authenticator は、このユーザーのログインで使い回す（同じステップのコードを2回出さないため）
 */
export async function registerUser(page: Page, user: TestUser): Promise<Authenticator> {
  const register = new RegisterPage(page);
  await register.goto();
  await register.submit(user.loginId, user.password);

  const setup = new RegisterSetupPage(page);
  await setup.expectOpened();
  const authenticator = await setup.createAuthenticator();
  await setup.submit(await authenticator.nextCode());

  await new DashboardPage(page).expectOpened();
  return authenticator;
}

/** ログイン画面から、ID・パスワード → 認証コード → ダッシュボードまで進む */
export async function login(
  page: Page,
  user: TestUser,
  authenticator: Authenticator,
): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.submit(user.loginId, user.password);

  const verify = new LoginVerifyPage(page);
  await verify.expectOpened();
  await verify.submit(await authenticator.nextCode());

  await new DashboardPage(page).expectOpened();
}
