import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,

  /*
   * `no-undef` and `no-unused-vars`, which eslint-config-next leaves off
   * because TypeScript reports both. This project is plain JavaScript, so
   * nothing reported them: a missing `surfaceClasses` import passed lint and a
   * zero-warning production build, then threw when a user opened the dialog.
   *
   * `argsIgnorePattern` covers the `_prevState` every `useActionState` action
   * takes and none reads.
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
