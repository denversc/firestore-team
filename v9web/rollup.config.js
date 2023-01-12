import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescriptPlugin from '@rollup/plugin-typescript';

export default {
  input: 'src/index_browser.ts',
  output: {
    file: 'dist/bundle.browser.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    resolve(),
    typescriptPlugin({ exclude: '**/*_node.ts' }),
    commonjs()
  ]
};
