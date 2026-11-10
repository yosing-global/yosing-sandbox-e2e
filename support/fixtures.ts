import { test as base } from "@playwright/test";
import { createLoginId, TEST_PASSWORD } from "./test-data";

// シナリオは @playwright/test ではなく、ここの test・expect を使う

/** テストで新規登録するユーザー（テストごとに新しいログイン ID） */
export type TestUser = {
  loginId: string;
  password: string;
};

export const test = base.extend<{ user: TestUser }>({
  // テストごとに作る（固定の ID をテストに書かない）
  user: async ({}, use) => {
    await use({ loginId: createLoginId(), password: TEST_PASSWORD });
  },
});

export { expect } from "@playwright/test";
