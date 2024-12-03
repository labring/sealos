// 根据枚举值获取枚举键
export const getEnumKeyByValue = <T extends { [key: string]: string }>(
  enumObj: T,
  value: string
): keyof T | undefined => {
  const keys = Object.keys(enumObj) as Array<keyof T>
  return keys.find((key) => enumObj[key] === value)
}

/**
 * 获取翻译，如果翻译不存在则返回指定的默认翻译
 * @param key - 翻译键
 * @param defaultKey - 默认翻译键
 * @param t - i18n 翻译函数
 */
export const getTranslationWithFallback = (
  key: string,
  defaultKey: string,
  t: (key: string) => string
): string => {
  const translated = t(key)
  return translated === key ? t(defaultKey) : translated
}
