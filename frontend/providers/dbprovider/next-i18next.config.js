//next-i18next.config.js
/**
 * @type {import('next-i18next').UserConfig}
 */

module.exports = {
  i18n: {
    defaultLocale: 'zh',
    locales: ['en', 'zh'],
    localeDetection: false
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development'
}
