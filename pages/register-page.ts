import { expect, type Locator, type Page } from "@playwright/test";
import { Authenticator } from "../support/totp";
import {
  clickAndWaitForSubmit,
  CODE_HINT,
  dangerNotice,
  pathPattern,
  tabTitle,
  visibleField,
} from "./common";

/** 新規登録（ステップ1：ログイン ID・パスワード） */
export class RegisterPage {
  static readonly path = "/register";
  static readonly heading = "新規登録";
  static readonly title = tabTitle("新規登録");
  static readonly notices = {
    /** 赤：ログイン ID が使われている（LOGIN_ID_TAKEN） */
    loginIdTaken: "このログイン ID は使われています。別の ID にしてください。",
    /** 赤：最初からやり直し（REGISTRATION_NOT_FOUND・OTP_ATTEMPTS_EXCEEDED） */
    restart: "登録を完了できませんでした。最初からやり直してください。",
  } as const;

  readonly loginId: Locator;
  readonly password: Locator;
  readonly nextButton: Locator;
  readonly loginLink: Locator;
  readonly dangerNotice: Locator;

  constructor(readonly page: Page) {
    this.loginId = visibleField(page, "ログイン ID");
    this.password = visibleField(page, "パスワード");
    this.nextButton = page.getByRole("button", { name: "次へ" });
    this.loginLink = page.getByRole("link", { name: "ログイン", exact: true });
    this.dangerNotice = dangerNotice(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(RegisterPage.path);
    await this.expectOpened();
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(pathPattern(RegisterPage.path));
    await expect(this.page).toHaveTitle(RegisterPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: RegisterPage.heading, exact: true }),
    ).toBeVisible();
  }

  /** ログイン ID・パスワードを入れて「次へ」 */
  async submit(loginId: string, password: string): Promise<void> {
    await this.loginId.fill(loginId);
    await this.password.fill(password);
    await clickAndWaitForSubmit(this.page, this.nextButton);
  }
}

/**
 * 新規登録（ステップ2：認証アプリの設定）
 * キーは秘密の値。キーを含む範囲（main 全体など）に文言の確かめをかけない（失敗したときにログへキーが出るため）
 */
export class RegisterSetupPage {
  static readonly path = "/register/setup";
  static readonly heading = "認証アプリの設定";
  static readonly title = tabTitle("認証アプリの設定");
  static readonly notices = {
    /** 赤：コードが違う（OTP_INVALID。ログインと同じ） */
    otpInvalid: "コードが違います。もう一度入力してください。",
  } as const;
  static readonly codeHint = CODE_HINT;

  /** 「QR コードを読み取れない場合」（開くとキーが出る。PC では閉じ、スマホでは最初から開いている） */
  readonly keyToggle: Locator;
  readonly setupKey: Locator;
  readonly copyKeyButton: Locator;
  readonly qrCode: Locator;
  readonly code: Locator;
  readonly registerButton: Locator;
  readonly backLink: Locator;
  readonly dangerNotice: Locator;

  constructor(readonly page: Page) {
    this.keyToggle = page.getByText("QR コードを読み取れない場合", { exact: true });
    this.setupKey = page.getByLabel("セットアップキー", { exact: true });
    this.copyKeyButton = page.getByRole("button", { name: "キーをコピー" });
    this.qrCode = page.getByRole("img", { name: "認証アプリの設定用の QR コード" });
    this.code = visibleField(page, "6桁のコード");
    this.registerButton = page.getByRole("button", { name: "登録する" });
    this.backLink = page.getByRole("link", { name: "ID・パスワードの入力に戻る" });
    this.dangerNotice = dangerNotice(page);
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(pathPattern(RegisterSetupPage.path));
    await expect(this.page).toHaveTitle(RegisterSetupPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: RegisterSetupPage.heading, exact: true }),
    ).toBeVisible();
  }

  /**
   * キーを読み、認証アプリの代わりを作る
   * 閉じていれば開く（PC）。キーの値はログに出さない
   */
  async createAuthenticator(): Promise<Authenticator> {
    if (!(await this.setupKey.isVisible())) {
      await this.keyToggle.click();
    }
    await expect(this.setupKey).toBeVisible();
    return new Authenticator(await this.setupKey.innerText());
  }

  /** コードを入れて「登録する」 */
  async submit(code: string): Promise<void> {
    await this.code.fill(code);
    await clickAndWaitForSubmit(this.page, this.registerButton);
  }
}
