import { customAlphabet } from 'nanoid';

export const K8S_RFC1035_NAME_MAX_LENGTH = 63;
export const APP_RANDOM_ID_LENGTH = 8;
export const APP_RANDOM_SUFFIX_LENGTH = APP_RANDOM_ID_LENGTH + 1;
export const POD_GENERATED_SUFFIX_LENGTH = 16;
export const APP_GENERATED_NAME_MAX_LENGTH =
  K8S_RFC1035_NAME_MAX_LENGTH - POD_GENERATED_SUFFIX_LENGTH;

// 38 = 63 RFC1035 max - 9 app random suffix - 16 pod suffix.
export const APP_NAME_BASE_MAX_LENGTH =
  K8S_RFC1035_NAME_MAX_LENGTH - APP_RANDOM_SUFFIX_LENGTH - POD_GENERATED_SUFFIX_LENGTH;

export const APP_NAME_BASE_PATTERN = /^[a-z]([-a-z0-9]*[a-z0-9])?$/;
export const APP_GENERATED_NAME_PATTERN = /^[a-z]([-a-z0-9]*[a-z0-9])?$/;

const createRandomId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', APP_RANDOM_ID_LENGTH);

export const isValidAppNameBase = (baseName: string) =>
  baseName.length > 0 &&
  baseName.length <= APP_NAME_BASE_MAX_LENGTH &&
  APP_NAME_BASE_PATTERN.test(baseName);

export const isValidGeneratedAppName = (appName: string) =>
  appName.length > 0 &&
  appName.length <= APP_GENERATED_NAME_MAX_LENGTH &&
  APP_GENERATED_NAME_PATTERN.test(appName);

export const generateAppName = (baseName: string) => `${baseName}-${createRandomId()}`;
