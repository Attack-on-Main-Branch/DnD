import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,

  /*
   * `no-undef` and `no-unused-vars`, which eslint-config-next leaves off.
   *
   * That is a reasonable default for the project it assumes: TypeScript reports
   * both, so enabling them in ESLint only duplicates the diagnostic. This
   * project is plain JavaScript, so nothing reported them at all — and the hole
   * was exactly the size of a real bug. A refactor added a `surfaceClasses(...)`
   * call to confirm-dialog.jsx and failed to add the import; lint passed, the
   * production build passed with zero warnings, and the dialog threw
   * "surfaceClasses is not defined" the first time a user opened it.
   *
   * A missing import is the single most likely mistake when moving code between
   * files, which is most of what a refactor is. These two rules are the only
   * thing in this toolchain that can see it.
   *
   * `argsIgnorePattern` covers the `_prevState` that every `useActionState`
   * action takes and none of them reads; `varsIgnorePattern` covers the same
   * convention for destructured values kept for documentation.
   */
  {
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

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
