import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

const bundle = (config) => {
  return {
    ...config,
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
        file: `dist/index.js`,
        format: "cjs",
        sourcemap: true,
        exports: "auto",
      },
      {
        file: `dist/index.mjs`,
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
      file: `dist/index.d.ts`,
      format: "es",
    },
  }),

  bundle({
    plugins: [esbuild()],
    input: "src/master.ts",
    output: [
      {
        file: `dist/master.js`,
        format: "cjs",
        sourcemap: true,
        exports: "auto",
      },
      {
        file: `dist/master.mjs`,
        format: "es",
        sourcemap: true,
        exports: "auto",
      },
    ],
  }),

  bundle({
    plugins: [dts()],
    input: "src/master.ts",
    output: {
      file: `dist/master.d.ts`,
      format: "es",
    },
  }),
];
