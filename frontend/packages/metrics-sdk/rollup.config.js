import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import copy from 'rollup-plugin-copy';

const external = ['axios', 'dayjs', '@kubernetes/client-node'];

export default [
  {
    input: 'src/index.ts',
    output: [
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
    ],
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
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
    plugins: [
      dts(),
      copy({
        targets: [{ src: 'package.json', dest: 'dist' }]
      })
    ]
  }
];
