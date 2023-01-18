import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescriptPlugin from '@rollup/plugin-typescript';

export default {
  input: 'src/browser/index.ts',
  output: {
    file: 'dist/bundle.browser.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [resolve(), typescriptPlugin({ exclude: '**/node/**' }), commonjs()]
};
