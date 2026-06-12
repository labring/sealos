export const K8S_RFC1035_NAME_MAX_LENGTH = 63;
export const SERVICE_RANDOM_SUFFIX_LENGTH = 22;
export const POD_GENERATED_SUFFIX_LENGTH = 16;

// 25 = 63 RFC1035 max - 22 nodeport service suffix - 16 pod suffix.
export const APP_NAME_BASE_MAX_LENGTH =
  K8S_RFC1035_NAME_MAX_LENGTH - SERVICE_RANDOM_SUFFIX_LENGTH - POD_GENERATED_SUFFIX_LENGTH;
export const APP_GENERATED_NAME_MAX_LENGTH = APP_NAME_BASE_MAX_LENGTH;

export const APP_NAME_BASE_PATTERN = /^[a-z]([-a-z0-9]*[a-z0-9])?$/;
export const APP_GENERATED_NAME_PATTERN = /^[a-z]([-a-z0-9]*[a-z0-9])?$/;

export const isValidAppNameBase = (baseName: string) =>
  baseName.length > 0 &&
  baseName.length <= APP_NAME_BASE_MAX_LENGTH &&
  APP_NAME_BASE_PATTERN.test(baseName);

export const isValidGeneratedAppName = (appName: string) =>
  appName.length > 0 &&
  appName.length <= APP_GENERATED_NAME_MAX_LENGTH &&
  APP_GENERATED_NAME_PATTERN.test(appName);

export const generateAppName = (baseName: string) => baseName;
