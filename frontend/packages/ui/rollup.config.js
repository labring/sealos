// rollup.config.js

import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

export default {
  //entry point
  input: './src/index.ts',
  preserveModules: true,

  //output directory
  output: [
    {
      dir: './dist/esm/',
      format: 'esm',
      sourcemap: true,
      exports: 'auto'
    }
  ],

  //plugins
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({ useTsconfigDeclarationDir: true }),
    terser()
  ]
};
