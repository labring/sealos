/**
 * Configuration reading and validation utilities.
 */

export { readConfig } from './reader';
export { prettyPrintErrors, formatErrorCompact, type PrettyPrintOptions } from './error-formatter';
export { mountToGlobalThis } from './utils';
export type { ConfigResult, ConfigSuccess, ConfigError } from './types';
