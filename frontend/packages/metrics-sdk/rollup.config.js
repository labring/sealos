import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { builtinModules } from 'node:module';

const external = [
  'axios',
  'dayjs',
  '@kubernetes/client-node',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`)
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['src/**/*.ts'],
        declaration: false
      })
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [dts()]
  }
];
