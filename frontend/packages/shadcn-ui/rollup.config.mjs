import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import * as tsc from 'typescript';

const external = ['react', 'react-dom', 'next'];

const publicEntries = {
  index: './src/index.ts'
};

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: publicEntries,
    external,
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].mjs'
    },
    plugins: [
      resolve({ extensions: ['.ts', '.tsx'], browser: true }),
      typescript({
        typescript: tsc,
        tsconfig: path.resolve('tsconfig.json'),
        declaration: false,
        emitDeclarationOnly: false,
        noEmitOnError: true
      })
    ]
  }
];
