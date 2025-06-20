import "i18next"

import type common from "../app/i18n/locales/en/common.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: {
      common: typeof common
    }
  }
}
