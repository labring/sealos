/**
 * Configuration reading and validation utilities.
 */

export { readConfig } from './reader';
export { prettyPrintErrors, formatErrorCompact, type PrettyPrintOptions } from './error-formatter';
export { mountToGlobalThis } from './utils';
export {
  ServerMisconfiguredError,
  isServerMisconfiguredError,
  validateClientAppConfigOrThrow
} from './client-app-config';
export type { ConfigResult, ConfigSuccess, ConfigError } from './types';
