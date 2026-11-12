import { expect, type Locator, type Page } from "@playwright/test";
import {
  clickAndWaitForSubmit,
  CODE_HINT,
  dangerNotice,
  infoNotice,
  pathPattern,
  tabTitle,
  visibleField,
} from "./common";

/** ログイン（ステップ1：ログイン ID・パスワード） */
export class LoginPage {
  static readonly path = "/login";
  static readonly heading = "ログイン";
  static readonly title = tabTitle("ログイン");
  static readonly notices = {
    /** 赤：ID かパスワードが違う（INVALID_CREDENTIALS） */
    invalidCredentials: "ログイン ID かパスワードが違います。",
    /** 赤：コードの誤りが続いた後（OTP_ATTEMPTS_EXCEEDED） */
    retryLater: "しばらく時間をおいてから、もう一度ログインしてください。",
    /** 青：期限切れ・別のタブでログインを始めた（SESSION_INVALID・LOGIN_TOKEN_INVALID） */
    expired: "ログインの有効期限が切れました。もう一度ログインしてください。",
  } as const;

  readonly loginId: Locator;
  readonly password: Locator;
  readonly nextButton: Locator;
  readonly registerLink: Locator;
  readonly dangerNotice: Locator;
  readonly infoNotice: Locator;

  constructor(readonly page: Page) {
    this.loginId = visibleField(page, "ログイン ID");
    this.password = visibleField(page, "パスワード");
    this.nextButton = page.getByRole("button", { name: "次へ" });
    this.registerLink = page.getByRole("link", { name: "新規登録", exact: true });
    this.dangerNotice = dangerNotice(page);
    this.infoNotice = infoNotice(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(LoginPage.path);
    await this.expectOpened();
  }

  /** この画面が開いている（URL・タブのタイトル・見出し） */
  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(pathPattern(LoginPage.path));
    await expect(this.page).toHaveTitle(LoginPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: LoginPage.heading, exact: true }),
    ).toBeVisible();
  }

  /** ログイン ID・パスワードを入れて「次へ」 */
  async submit(loginId: string, password: string): Promise<void> {
    await this.loginId.fill(loginId);
    await this.password.fill(password);
    await clickAndWaitForSubmit(this.page, this.nextButton);
  }
}

/** ログイン（ステップ2：認証コード） */
export class LoginVerifyPage {
  static readonly path = "/login/verify";
  static readonly heading = "認証コードの入力";
  static readonly title = tabTitle("認証コードの入力");
  static readonly notices = {
    /** 赤：コードが違う（OTP_INVALID） */
    otpInvalid: "コードが違います。もう一度入力してください。",
  } as const;
  static readonly codeHint = CODE_HINT;

  readonly code: Locator;
  readonly loginButton: Locator;
  readonly backLink: Locator;
  readonly dangerNotice: Locator;

  constructor(readonly page: Page) {
    this.code = visibleField(page, "6桁のコード");
    this.loginButton = page.getByRole("button", { name: "ログイン", exact: true });
    this.backLink = page.getByRole("link", { name: "ログイン ID・パスワードの入力に戻る" });
    this.dangerNotice = dangerNotice(page);
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(pathPattern(LoginVerifyPage.path));
    await expect(this.page).toHaveTitle(LoginVerifyPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: LoginVerifyPage.heading, exact: true }),
    ).toBeVisible();
  }

  /** コードを入れて「ログイン」 */
  async submit(code: string): Promise<void> {
    await this.code.fill(code);
    await clickAndWaitForSubmit(this.page, this.loginButton);
  }
}
