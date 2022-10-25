import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescriptPlugin from "@rollup/plugin-typescript";

export default {
  input: "index_browser.ts",
  output: {
    file: "bundle.js",
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    resolve(),
    typescriptPlugin(),
    commonjs(),
  ],
};
