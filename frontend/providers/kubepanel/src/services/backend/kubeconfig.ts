import { AxiosRequestConfig } from 'axios';
import jsYaml from 'js-yaml';
import https from 'https';
import { camelCase, entries } from 'lodash';
import { KebabCasedPropertiesDeep, ReadonlyDeep } from 'type-fest';

type Cluster = {
  server: string;
  tlsServerName?: string;
  insecureSkipTlsVerify?: boolean;
  certificateAuthorityData?: string;
};

type AuthInfo = Partial<{
  clientCertificateData: string;
  clientKeyData: string;
  token: string;
  username: string;
  password: string;
  authProvider: AuthProviderConfig;
}>;

type Context = {
  cluster: string;
  user: string;
  namespace?: string;
};

type NamedItem<T> = {
  name: string;
} & {
  [K in keyof T]: T[K];
};

type AuthProviderConfig = {
  name: string;
  config: ReadonlyDeep<Record<string, string>>;
};

type YamlKubeConfig = KebabCasedPropertiesDeep<KubeConfig>;

type KubeConfig = {
  clusters: NamedItem<Cluster>[];
  users: NamedItem<AuthInfo>[];
  contexts: NamedItem<Context>[];
  currentContext: string;
};

/**
 * Load kubeconfig from a YAML string and return a Kubernetes configuration object.
 *
 * @param yaml The YAML string representing the kubeconfig.
 * @return The Kubernetes configuration object.
 */
export function loadKubeConfig(yaml: string): KubeConfig {
  const yamlKC = jsYaml.load(yaml) as YamlKubeConfig;

  if (!yamlKC['current-context']) throw new Error('current-context is required in kubeconfig');
  return {
    clusters: loadNamedItems(yamlKC.clusters, 'cluster', ['server']),
    users: loadNamedItems(yamlKC.users, 'user'),
    contexts: loadNamedItems(yamlKC.contexts, 'context', ['cluster', 'user']),
    currentContext: yamlKC['current-context']
  };
}

type NonUndefinedKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

function loadNamedItems<T>(
  namedItems: NamedItem<T>[],
  itemType: 'cluster' | 'user' | 'context',
  required?: NonUndefinedKeys<T>[]
): NamedItem<T>[] {
  return namedItems.map((namedItem, idx) => {
    if (!namedItem.name) {
      throw new Error(`"name" is required in ${itemType}s[${idx}]`);
    }

    // for parse yaml file
    const item = namedItem[itemType as keyof NamedItem<T>] as T;
    if (!item) {
      throw new Error(`${itemType} is required in ${itemType}s[${idx}]`);
    }
    if (required) {
      required.forEach((key) => {
        if (!item[key]) throw new Error(`${String(key)} is required in ${itemType}s[${idx}]`);
      });
    }

    const converted: Record<string, any> = { name: namedItem.name };

    entries(item).forEach(([key, value]) => {
      converted[camelCase(key)] = value;
    });

    return converted as NamedItem<T>;
  });
}

/**
 * Finds and returns the named context object from the given array of contexts.
 *
 * @param contexts The array of named context objects.
 * @param currentContext The name of the current context.
 * @return The named context object that matches the current context, or undefined if not found.
 */
export function getCurrentContextObject(
  contexts: Array<NamedItem<Context>>,
  currentContext: string
): NamedItem<Context> | undefined {
  return contexts.find((item) => item.name === currentContext);
}

/**
 * Finds and returns the user object from the given array of users that matches the name of the current context object's user.
 *
 * @param users The array of users to search through.
 * @param currentContextObject The current context object containing the user name to match.
 * @return The user object with the matching name, or undefined if not found.
 */
export function getCurrentUserObject(
  users: Array<NamedItem<AuthInfo>>,
  currentContextObject: NamedItem<Context>
) {
  return users.find((item) => item.name === currentContextObject.user);
}

/**
 * Finds and returns the current cluster object from the given array of clusters
 * based on the name of the current context object's cluster.
 *
 * @param clusters The array of clusters to search in.
 * @param currentContextObject The current context object.
 * @return The current cluster object, or undefined if not found.
 */
export function getCurrentClusterObject(
  clusters: Array<NamedItem<Cluster>>,
  currentContextObject: NamedItem<Context>
) {
  return clusters.find((item) => item.name === currentContextObject.cluster);
}

/**
 * Generates an `AxiosRequestConfig` based on the provided kubeConfig.
 *
 * @param  kubeConfig The kubeConfig object that contains the necessary information for generating the Axios request configuration.
 * @return `AxiosRequestConfig`
 */
export function getAxiosRequestConfig(kubeConfig: KubeConfig): AxiosRequestConfig {
  const contextObj = getCurrentContextObject(kubeConfig.contexts, kubeConfig.currentContext);
  if (!contextObj) {
    throw new Error('cannot get a current context in kubeconfig');
  }
  const userObj = getCurrentUserObject(kubeConfig.users, contextObj);
  if (!userObj) {
    throw new Error('cannot get a current user in kubeconfig');
  }
  const clusterObj = getCurrentClusterObject(kubeConfig.clusters, contextObj);
  if (!clusterObj) {
    throw new Error('cannot get a current cluster in kubeconfig');
  }

  const config: AxiosRequestConfig = {};

  const skipTlsVerify = clusterObj.insecureSkipTlsVerify === true;

  // HTTPS
  const rejectUnauthorized = skipTlsVerify ? false : true;

  const ca = bufferFrom(clusterObj.certificateAuthorityData);
  const cert = bufferFrom(userObj.clientCertificateData);
  const key = bufferFrom(userObj.clientKeyData);

  config.httpsAgent = new https.Agent({
    rejectUnauthorized,
    ca,
    cert,
    key,
    servername: clusterObj.tlsServerName
  });

  // Authorization Header
  const authorization = userObj.token ? `Bearer ${userObj.token}` : '';

  config.headers = {
    Authorization: authorization,
    'Content-Type': 'application/json'
  };

  // Auth
  config.auth =
    userObj.username && userObj.password
      ? {
          username: userObj.username,
          password: userObj.password
        }
      : undefined;

  // Base URL
  config.baseURL = clusterObj.server.replace(/\/$/, '');
  return config;
}

function bufferFrom(data: string | undefined): Buffer | undefined {
  if (!data) return undefined;
  return Buffer.from(data, 'base64');
}
