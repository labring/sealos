//next-i18next.config.js
/**
 * @type {import('next-i18next').UserConfig}
 */

const path = require('path')
module.exports = {
  i18n: {
    defaultLocale: 'en',
    fallbackLng: 'en',
    locales: ['en', 'zh', 'zh-Hans'],
    localeSubpaths: {
      en: 'en',
      zh: 'zh',
      'zh-Hans': 'zh-Hans',
    },
  },
}
