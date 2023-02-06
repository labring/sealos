import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import nodePolyfills from 'rollup-plugin-node-polyfills'

const bundle = ({ plugins, ...config }) => {
  return {
    ...config,
    plugins: [
      ...plugins,
      nodePolyfills()
    ],
    input: config.input,
    external: (id) => !/^[./]/.test(id),
  };
};

export default [
  bundle({
    plugins: [esbuild()],
    input: "src/index.ts",
    output: [
      {
        file: `build/index.js`,
        format: "cjs",
        sourcemap: true,
        exports: "auto",
      },
      {
        file: `build/index.mjs`,
        format: "es",
        sourcemap: true,
        exports: "auto",
      },
    ],
  }),

  bundle({
    plugins: [dts()],
    input: "src/index.ts",
    output: {
      file: `build/index.d.ts`,
      format: "es",
    },
  }),
];
