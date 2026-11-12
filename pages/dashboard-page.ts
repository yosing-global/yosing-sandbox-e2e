import { expect, type Locator, type Page } from "@playwright/test";
import { clickAndWaitForSubmit, pathPattern, tabTitle } from "./common";

/** ダッシュボード（ホーム） */
export class DashboardPage {
  static readonly path = "/dashboard";
  static readonly heading = "ホーム";
  static readonly title = tabTitle("ホーム");

  /** アカウントの表のログイン ID */
  readonly loginId: Locator;
  /** アカウントの表の登録した日時（日本時間。例：2026年11月3日 10:25） */
  readonly registeredAt: Locator;
  /** スマホのメニューのボタン（PC では出ない） */
  readonly openMenuButton: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    const account = page.getByRole("region", { name: "アカウント", exact: true });
    this.loginId = accountValue(account, "ログイン ID");
    this.registeredAt = accountValue(account, "登録した日時");
    this.openMenuButton = page.getByRole("button", { name: "メニューを開く" });
    this.logoutButton = page.getByRole("button", { name: "ログアウト" });
  }

  async goto(): Promise<void> {
    await this.page.goto(DashboardPage.path);
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveURL(pathPattern(DashboardPage.path));
    await expect(this.page).toHaveTitle(DashboardPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: DashboardPage.heading, exact: true }),
    ).toBeVisible();
  }

  /** ログアウト（スマホでは、メニューを開いてから押す） */
  async logout(): Promise<void> {
    if (await this.openMenuButton.isVisible()) {
      await this.openMenuButton.click();
    }
    await clickAndWaitForSubmit(this.page, this.logoutButton);
  }
}

/** アカウントの表（dl）で、見出し（dt）に続く値（dd） */
function accountValue(account: Locator, term: string): Locator {
  return account
    .locator("dt")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}
