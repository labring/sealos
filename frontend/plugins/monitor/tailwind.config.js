/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        color: {
          ok: '#399c3d',
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
