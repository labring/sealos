import path from 'node:path';
import preserveDirectives from 'rollup-plugin-preserve-directives';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import * as tsc from 'typescript';

const external = ['react', 'react-dom', 'react/jsx-runtime', 'next', 'react-hook-form'];

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
      preserveDirectives(),
      resolve({ extensions: ['.ts', '.tsx'], browser: true }),
      commonjs({
        include: /node_modules/,
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto'
      }),
      typescript({
        typescript: tsc,
        tsconfig: path.resolve('tsconfig.json'),
        declaration: false,
        emitDeclarationOnly: false,
        noEmitOnError: true
      })
    ],
    onwarn: (warning) => {
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
      else console.warn(warning.message);
    }
  }
];
