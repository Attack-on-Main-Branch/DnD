import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

/**
 * Not the Next preset — nothing here is React, JSX or browser code. Plain ESM
 * on Node, in the server process and under the test runner. `no-undef` and
 * `no-unused-vars` are on for the reason Maria's config gives.
 */
export default defineConfig([
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        // FormData, which the `read*Values` functions take, is a global in
        // modern Node as well as in the browser.
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: ["supabase/.temp/**"],
  },
]);
