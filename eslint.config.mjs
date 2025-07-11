import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable React unescaped entities rule
      "react/no-unescaped-entities": "off",
      
      // Disable unused variables rule
      "@typescript-eslint/no-unused-vars": "off",
      
      // Disable explicit any rule
      "@typescript-eslint/no-explicit-any": "off",
      
      // Disable Next.js img element warning
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
