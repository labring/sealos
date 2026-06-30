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

export const isValidRfc1035Name = (name: string) =>
  name.length > 0 &&
  name.length <= K8S_RFC1035_NAME_MAX_LENGTH &&
  APP_GENERATED_NAME_PATTERN.test(name);

type NamedKubernetesResource = {
  kind?: string;
  metadata?: {
    name?: unknown;
  };
  spec?: {
    rules?: {
      http?: {
        paths?: {
          backend?: {
            service?: {
              name?: unknown;
            };
          };
        }[];
      };
    }[];
  };
};

type InvalidServiceNameTarget = {
  resourceKind: string;
  resourceName: unknown;
  serviceName: string;
  source: 'metadata' | 'ingress-backend';
};

export const getInvalidGeneratedAppNameMessage = (name: unknown) => {
  if (typeof name !== 'string' || isValidGeneratedAppName(name)) return;

  return `Application name "${name}" is invalid. Use ${APP_GENERATED_NAME_MAX_LENGTH} characters or fewer, start with a lowercase letter, use only lowercase letters, numbers, or hyphens, and end with a lowercase letter or number.`;
};

export const getInvalidRfc1035ServiceNameMessage = (resources: NamedKubernetesResource[]) => {
  const invalidTarget = resources.reduce<InvalidServiceNameTarget | undefined>(
    (result, resource) => {
      if (result) return result;

      const name = resource?.metadata?.name;
      if (resource.kind === 'Service' && typeof name === 'string' && !isValidRfc1035Name(name)) {
        return {
          resourceKind: 'Service',
          resourceName: name,
          serviceName: name,
          source: 'metadata'
        };
      }

      if (resource.kind === 'Ingress') {
        const invalidBackendServiceName = resource.spec?.rules
          ?.flatMap((rule) => rule.http?.paths || [])
          .map((path) => path.backend?.service?.name)
          .find(
            (serviceName) => typeof serviceName === 'string' && !isValidRfc1035Name(serviceName)
          );

        if (typeof invalidBackendServiceName === 'string') {
          return {
            resourceKind: 'Ingress',
            resourceName: name,
            serviceName: invalidBackendServiceName,
            source: 'ingress-backend'
          };
        }
      }

      return undefined;
    },
    undefined
  );

  if (!invalidTarget) return;

  const ruleText =
    'Names must start with a lowercase letter, contain only lowercase letters, numbers, or hyphens, and end with a lowercase letter or number.';

  if (invalidTarget.source === 'ingress-backend') {
    return `Ingress "${invalidTarget.resourceName || ''}" references invalid backend service "${
      invalidTarget.serviceName
    }". ${ruleText}`;
  }

  return `${invalidTarget.resourceKind} "${invalidTarget.serviceName}" has an invalid name. ${ruleText}`;
};
