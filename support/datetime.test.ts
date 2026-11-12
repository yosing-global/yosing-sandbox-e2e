import { expect, test } from "@playwright/test";
import { isDisplayedWithin, parseJstDisplay } from "./datetime";

test.describe("parseJstDisplay", () => {
  // 4.1 の例の表示を、日本時間として読むこと
  test("2026年11月3日 10:25 は UTC の 01:25", () => {
    expect(parseJstDisplay("2026年11月3日 10:25")).toBe(Date.UTC(2026, 10, 3, 1, 25));
  });

  // 日本時間の朝（UTC では前の日）でも、日付を取り違えないこと
  test("日本時間の 0:05 は、UTC では前の日の 15:05", () => {
    expect(parseJstDisplay("2026年1月1日 0:05")).toBe(Date.UTC(2025, 11, 31, 15, 5));
  });

  // 0 で埋めた形でも読めること（web の表示の作りに寄せない）
  test("0 で埋めた形も読める", () => {
    expect(parseJstDisplay("2026年01月03日 09:05")).toBe(Date.UTC(2026, 0, 3, 0, 5));
  });

  // 形が違う・ありえない日時なら、読めないとすること
  for (const text of [
    "2026/11/03 10:25",
    "2026年11月3日",
    "2026年13月1日 10:00",
    "2026年2月30日 10:00",
    "2026年11月3日 24:00",
  ]) {
    test(`「${text}」は読めない`, () => {
      expect(parseJstDisplay(text)).toBeUndefined();
    });
  }
});

test.describe("isDisplayedWithin", () => {
  const from = Date.UTC(2026, 10, 3, 1, 25, 40);
  const to = Date.UTC(2026, 10, 3, 1, 25, 50);

  // 同じ分の中なら入るとすること（表示は分で切り捨て）
  test("同じ分なら入る", () => {
    expect(isDisplayedWithin("2026年11月3日 10:25", from, to)).toBe(true);
  });

  // 時計のずれの分（1分）だけ前後を許すこと
  test("1分のずれは許す", () => {
    expect(isDisplayedWithin("2026年11月3日 10:24", from, to)).toBe(true);
    expect(isDisplayedWithin("2026年11月3日 10:26", from, to)).toBe(true);
  });

  // それより離れていれば入らないとすること
  test("2分離れていれば入らない", () => {
    expect(isDisplayedWithin("2026年11月3日 10:23", from, to)).toBe(false);
    expect(isDisplayedWithin("2026年11月3日 10:28", from, to)).toBe(false);
  });

  // 形が違えば入らないとすること
  test("形が違えば入らない", () => {
    expect(isDisplayedWithin("不明", from, to)).toBe(false);
  });
});
