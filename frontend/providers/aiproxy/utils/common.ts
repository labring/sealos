// 根据枚举值获取枚举键
export const getEnumKeyByValue = <T extends { [key: string]: string }>(
  enumObj: T,
  value: string
): keyof T | undefined => {
  const keys = Object.keys(enumObj) as Array<keyof T>
  return keys.find((key) => enumObj[key] === value)
}
