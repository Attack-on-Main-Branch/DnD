import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

/**
 * Sina's own lint config, because it had none.
 *
 * Maria's config gained `no-undef` and `no-unused-vars` after a missing import
 * shipped a runtime crash past a clean build — and then the comment there
 * claimed those rules were the only thing in this toolchain that could see such
 * a mistake. That was true of Maria and false of the repository: `npm run lint`
 * runs eslint inside Maria only, so nothing here was checked at all. Nine source
 * files and six test files could have dropped an import and shipped it.
 *
 * Not the Next preset — nothing in this package is React, JSX or browser code.
 * It is plain ESM running on Node, in the app's server process and under the
 * test runner, so those are the globals it gets.
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
