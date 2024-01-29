module.exports = {
  plugins: {
    /**
     * fix: nesting
     * @link https://tailwindcss.com/docs/using-with-preprocessors#nesting
     */
    'postcss-import': {},
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    autoprefixer: {}
  }
};
