import { expect, test } from "@playwright/test";

// 対象の環境につながること（web のヘルスチェックが UP を返す）を確かめる
test("ヘルスチェックが UP を返す", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "UP" });
});
