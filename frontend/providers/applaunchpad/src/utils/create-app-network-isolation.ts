import type { NetworkIsolationConfig, NetworkIsolationResponse } from '@/types/networkIsolation';

interface CreateAppWithNetworkIsolationOptions {
  appName: string;
  yamlList: string[];
  config?: NetworkIsolationConfig;
  appAlreadyCreated?: boolean;
}

interface CreateAppWithNetworkIsolationDependencies {
  deployApp: (yamlList: string[]) => Promise<unknown>;
  getNetworkIsolation: (appName: string) => Promise<NetworkIsolationResponse>;
  putNetworkIsolation: (
    appName: string,
    config: NetworkIsolationConfig,
    revision: string
  ) => Promise<NetworkIsolationResponse>;
}

export class NetworkIsolationAfterCreateError extends Error {
  readonly appName: string;
  readonly cause: unknown;

  constructor(appName: string, cause: unknown) {
    super('The application was created, but network isolation could not be saved.');
    this.name = 'NetworkIsolationAfterCreateError';
    this.appName = appName;
    this.cause = cause;
  }
}

export async function createAppWithNetworkIsolation(
  options: CreateAppWithNetworkIsolationOptions,
  dependencies: CreateAppWithNetworkIsolationDependencies
) {
  if (!options.appAlreadyCreated) {
    await dependencies.deployApp(options.yamlList);
  }

  if (!options.config) return;

  try {
    const current = await dependencies.getNetworkIsolation(options.appName);
    await dependencies.putNetworkIsolation(options.appName, options.config, current.revision);
  } catch (error) {
    throw new NetworkIsolationAfterCreateError(options.appName, error);
  }
}
