import type { Locator, Page } from "@playwright/test";

// 画面に共通の部品と文言
//   文言は Notion の「4.1 UI/UX設計」から書き写す（web の src/shared/messages.ts を読み込まない）
//   文言を変えるときは 4.1 → E2E → web の順に直す

/** タブのタイトル：「<画面の名前> | sandbox」 */
export function tabTitle(screenName: string): string {
  return `${screenName} | sandbox`;
}

/** 入力欄の下の誤り（形式の誤り・空のとき。ログインと新規登録で同じ文言） */
export const FIELD_ERRORS = {
  loginId: "英字・数字・_・- の3〜32文字で入力してください",
  password: "英字・数字・記号の12〜64文字で入力してください",
  code: "数字6桁で入力してください",
} as const;

/** 6桁のコードの入力欄の下の案内（確かめる文言） */
export const CODE_HINT = "コードは30秒ごとに変わります";

/**
 * 見えている入力欄（ラベルで探す）
 * web は離れた画面を隠して残す（Cache Components）。getByLabel は隠れた入力欄にも当たるため、見えているものに絞る
 */
export function visibleField(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

/**
 * お知らせの枠（赤：alert、青：status）
 * Next.js の画面の移動を読み上げる部品も role="alert" を持つため、main の中で探す
 * getByRole は隠れた要素を除くので、隠れて残る画面の main には当たらない
 */
export function dangerNotice(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

export function infoNotice(page: Page): Locator {
  return page.getByRole("main").getByRole("status");
}

/**
 * 送信のボタンを押し、送信（Server Action の POST）の応答まで待つ
 * 続けて送る操作（コードを何度も間違える等）で、前の応答の前に次を入れないため
 * 画面での事前の確認で送信しない操作（形式の誤り）には使わない（POST が無く、待ち続けるため）
 */
export async function clickAndWaitForSubmit(page: Page, button: Locator): Promise<void> {
  const origin = new URL(page.url()).origin;
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().startsWith(origin),
  );
  await button.click();
  await response;
}

/** URL のパスが一致するか（お知らせの理由の ?notice=… は付いていてもよい） */
export function pathPattern(path: string): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`^https?://[^/]+${escaped}(\\?[^#]*)?$`);
}
