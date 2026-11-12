import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  globalIgnores(["node_modules/**", "playwright-report/**", "test-results/**", "blob-report/**"]),
  js.configs.recommended,
  // 型の情報を使うルール（await の付け忘れ＝no-floating-promises など）も入れる
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.mjs"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Playwright の推奨ルール（テスト・画面の部品・テストの部品に当てる）
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**", "pages/**", "support/**"],
  },
  {
    files: ["tests/**", "pages/**", "support/**"],
    rules: {
      // 画面の部品の expectOpened（URL・タイトル・見出しの確かめ）も、確かめとして数える
      "playwright/expect-expect": ["warn", { assertFunctionPatterns: ["^expect"] }],
    },
  },
  // 整形は Prettier に任せる（ESLint の整形のルールを切る）。最後に置く
  prettier,
]);
