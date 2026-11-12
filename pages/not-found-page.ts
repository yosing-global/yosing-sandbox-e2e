import { expect, type Locator, type Page } from "@playwright/test";
import { tabTitle } from "./common";

/**
 * ページが見つからない（404）
 * エラー（500）の画面は E2E で確かめない（INTERNAL_ERROR を起こせないため）ので、部品を作らない
 */
export class NotFoundPage {
  static readonly heading = "ページが見つかりません";
  static readonly title = tabTitle("ページが見つかりません");

  readonly homeLink: Locator;

  constructor(readonly page: Page) {
    this.homeLink = page.getByRole("link", { name: "ホームに戻る" });
  }

  async expectOpened(): Promise<void> {
    await expect(this.page).toHaveTitle(NotFoundPage.title);
    await expect(
      this.page.getByRole("heading", { level: 1, name: NotFoundPage.heading, exact: true }),
    ).toBeVisible();
  }
}
