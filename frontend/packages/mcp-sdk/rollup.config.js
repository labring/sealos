import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const external = [
  'axios',
  'https',
  'zod',
  'path',
  'fs',
  '@vercel/mcp-adapter',
  'async_hooks',
  'openapi-types'
];

const createConfig = (input, output, plugins = []) => ({
  input,
  output,
  external,
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        noImplicitAny: false
      },
      noEmitOnError: false
    }),
    ...plugins
  ]
});

const createDtsConfig = (input, output, plugins = []) => ({
  input,
  output,
  external,
  plugins: [dts(), ...plugins]
});

export default [
  createConfig('src/index.ts', [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    }
  ]),

  createDtsConfig('src/index.ts', {
    file: 'dist/index.d.ts',
    format: 'es'
  }, [
    copy({
      targets: [
        { src: 'package.json', dest: 'dist' },
        { src: 'README.md', dest: 'dist', failOnError: false }
      ]
    })
  ])
];
