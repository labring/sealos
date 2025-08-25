/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  /**
   * fix: tailwind css conflict with antd
   * @link https://github.com/ant-design/ant-design/issues/38794#issuecomment-1345475630
   */
  corePlugins: {
    preflight: false
  },
  important: '#app',
  theme: {
    extend: {
      colors: {
        color: {
          ok: '#039855',
          warning: '#ff9800',
          error: '#ce3933',
          success: '#206923',
          terminated: '#9dabb5',
          vague: '#ededed',
          info: '#2d81a4',
          border: '#d9d9d9'
        }
      }
    }
  },
  safelist: [
    {
      pattern: /(bg|text|border)-color-(.*)/
    }
  ],
  plugins: []
};
