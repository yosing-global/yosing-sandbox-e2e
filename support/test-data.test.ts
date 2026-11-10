import { expect, test } from "@playwright/test";
import { createLoginId, LOGIN_ID_PREFIX, TEST_PASSWORD } from "./test-data";

// api のログイン ID・パスワードの規則
const LOGIN_ID_RULE = /^[a-z0-9_-]{3,32}$/;
const PASSWORD_RULE = /^[\x20-\x7E]{12,64}$/;

test.describe("createLoginId", () => {
  // 接頭辞 ＋ 時刻9文字 ＋ 乱数6文字 の25文字で、小文字・数字・_ だけであること
  test("25文字で、接頭辞から始まり、小文字・数字・_ だけ", () => {
    const loginId = createLoginId();

    expect(loginId).toHaveLength(25);
    expect(loginId.startsWith(LOGIN_ID_PREFIX)).toBe(true);
    expect(loginId).toMatch(/^[a-z0-9_]+$/);
    expect(loginId).toMatch(LOGIN_ID_RULE);
  });

  // 時刻と乱数が小さくても、0 で埋めて長さが変わらないこと
  test("時刻・乱数が小さくても、0 で埋めて25文字", () => {
    expect(createLoginId(35, () => 1)).toBe(`${LOGIN_ID_PREFIX}00000000z000001`);
  });

  // 乱数が最大でも6文字に収まること
  test("乱数が最大でも6文字", () => {
    const loginId = createLoginId(0, (max) => max - 1);

    expect(loginId).toBe(`${LOGIN_ID_PREFIX}000000000zzzzzz`);
  });

  // 同じ時刻に作っても、乱数で別の ID になること
  test("同じ時刻に続けて作っても、別の ID になる", () => {
    const now = Date.now();
    const ids = new Set(Array.from({ length: 100 }, () => createLoginId(now)));

    expect(ids.size).toBe(100);
  });
});

test.describe("TEST_PASSWORD", () => {
  // 本物でないと分かる（dummy を含む）うえで、api の規則に合うこと
  test("dummy を含み、api の規則に合う", () => {
    expect(TEST_PASSWORD).toContain("dummy");
    expect(TEST_PASSWORD).toMatch(PASSWORD_RULE);
  });
});
