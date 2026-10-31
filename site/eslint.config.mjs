import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // PROD-DASHBOARD-SWAP-01: the legacy admin panel was sidelined from
    // the active /dashboard route and is kept only for reference until
    // full retirement. It is not served, so it is not linted as active
    // code (its set-state-in-effect patterns predate the current rule).
    "app/_dashboard-old/**",
  ]),
]);

export default eslintConfig;
