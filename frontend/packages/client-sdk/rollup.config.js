import dts from 'rollup-plugin-dts';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

const bundleFile = ({ input, output }) => {
  return {
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      })
    ],
    input,
    output
  };
};
const bundleType = ({ input, output }) => {
  return {
    plugins: [dts()],
    input,
    output
  };
};

export default [
  // master
  bundleFile({
    input: 'src/master.ts',
    output: [
      {
        file: `dist/master.esm.js`,
        format: 'es'
      },
      {
        file: `dist/master.js`,
        format: 'cjs'
      }
    ]
  }),
  bundleType({
    input: 'src/master.ts',
    output: {
      file: `dist/master.d.ts`,
      format: 'es'
    },
    plugins: [dts()]
  }),
  // app
  bundleFile({
    input: 'src/app.ts',
    output: [
      {
        file: `dist/app.esm.js`,
        format: 'es'
      },
      {
        file: `dist/app.js`,
        format: 'cjs'
      }
    ]
  }),
  bundleType({
    input: 'src/app.ts',
    output: {
      file: `dist/app.d.ts`,
      format: 'es'
    },
    plugins: [dts()]
  }),
  // service
  bundleFile({
    input: 'src/service.ts',
    output: [
      {
        file: `dist/service.esm.js`,
        format: 'es'
      },
      {
        file: `dist/service.js`,
        format: 'cjs'
      }
    ]
  }),
  bundleType({
    input: 'src/service.ts',
    output: {
      file: `dist/service.d.ts`,
      format: 'es'
    },
    plugins: [dts()]
  }),
  // index
  bundleFile({
    input: 'src/index.ts',
    output: [
      {
        file: `dist/index.esm.js`,
        format: 'es'
      },
      {
        file: `dist/index.js`,
        format: 'cjs'
      }
    ]
  }),
  bundleType({
    input: 'src/index.ts',
    output: {
      file: `dist/index.d.ts`,
      format: 'es'
    },
    plugins: [
      dts(),
      copy({
        targets: [{ src: 'package.json', dest: 'dist' }]
      })
    ]
  })
];
