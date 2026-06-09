import { cloneDeep, forEach, isNumber, isBoolean, isObject, has } from 'lodash';
import { ownerReferencesKey, templateDeployKey } from '@/constants/keys';
import { EnvResponse } from '@/types';
import { Config } from '@/config';

export type ExtraResourceLabels = Record<string, string>;

const labelNameSegmentRegex = /^[A-Za-z0-9]([A-Za-z0-9_.-]{0,61}[A-Za-z0-9])?$/;
const dnsLabelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const reservedExtraLabelKeys = new Set([templateDeployKey, ownerReferencesKey]);

export const parseGithubUrl = (url: string) => {
  if (!url) return null;
  let urlObj = new URL(url);
  let pathParts = urlObj.pathname.split('/');

  return {
    hostname: urlObj.hostname,
    organization: pathParts[1],
    repository: pathParts[2],
    branch: pathParts[3],
    remainingPath: pathParts.slice(4).join('/') + urlObj.search
  };
};

function isValidLabelPrefix(prefix: string) {
  if (prefix.length > 253) return false;
  return prefix.split('.').every((part) => dnsLabelRegex.test(part));
}

export function validateExtraLabels(value: unknown): {
  error?: string;
  labels: ExtraResourceLabels;
} {
  if (value === undefined || value === null) {
    return { labels: {} };
  }
  if (!isObject(value) || Array.isArray(value)) {
    return { error: 'extraLabels must be an object.', labels: {} };
  }

  const labels: ExtraResourceLabels = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue !== 'string') {
      return { error: `extraLabels.${key} must be a string.`, labels: {} };
    }
    if (reservedExtraLabelKeys.has(key)) {
      return { error: `extraLabels.${key} is reserved.`, labels: {} };
    }

    const keyParts = key.split('/');
    if (keyParts.length > 2) {
      return { error: `extraLabels.${key} is not a valid Kubernetes label key.`, labels: {} };
    }
    const name = keyParts[keyParts.length - 1] ?? '';
    const prefix = keyParts.length === 2 ? keyParts[0] : '';
    if (!labelNameSegmentRegex.test(name) || (prefix && !isValidLabelPrefix(prefix))) {
      return { error: `extraLabels.${key} is not a valid Kubernetes label key.`, labels: {} };
    }
    if (rawValue.length > 63 || (rawValue !== '' && !labelNameSegmentRegex.test(rawValue))) {
      return { error: `extraLabels.${key} is not a valid Kubernetes label value.`, labels: {} };
    }
    labels[key] = rawValue;
  }

  return { labels };
}

function mergeLabels(target: any, labels: ExtraResourceLabels) {
  if (!target || Object.keys(labels).length === 0) return;
  target.labels = target.labels || {};
  Object.assign(target.labels, labels);
}

function ensurePath(root: any, keys: string[]) {
  let cursor = root;
  for (const key of keys) {
    if (!cursor?.[key]) cursor[key] = {};
    cursor = cursor[key];
  }
  return cursor;
}

function applyExtraLabels(obj: any, extraLabels: ExtraResourceLabels) {
  if (Object.keys(extraLabels).length === 0) return;

  obj.metadata = obj.metadata || {};
  mergeLabels(obj.metadata, extraLabels);

  if (obj?.spec?.template) {
    mergeLabels(ensurePath(obj.spec.template, ['metadata']), extraLabels);
  }

  if (obj?.spec?.jobTemplate?.spec?.template) {
    mergeLabels(ensurePath(obj.spec.jobTemplate.spec.template, ['metadata']), extraLabels);
  }

  forEach(obj?.spec?.volumeClaimTemplates, (claim) => {
    claim.metadata = claim.metadata || {};
    mergeLabels(claim.metadata, extraLabels);
  });

  forEach(obj?.spec?.componentSpecs, (component) => {
    forEach(component?.volumeClaimTemplates, (claim) => {
      claim.metadata = claim.metadata || {};
      mergeLabels(claim.metadata, extraLabels);
    });
  });
}

export const processEnvValue = (
  obj: any,
  labelName: string,
  extraLabels: ExtraResourceLabels = {}
) => {
  const newDeployment = cloneDeep(obj);

  forEach(newDeployment?.spec?.template?.spec?.containers, (container) => {
    forEach(container?.env, (env) => {
      if (isObject(env.value)) {
        env.value = JSON.stringify(env.value);
      } else if (isNumber(env.value) || isBoolean(env.value)) {
        env.value = env.value.toString();
      }
    });
  });

  applyExtraLabels(newDeployment, extraLabels);

  if (labelName) {
    newDeployment.metadata = newDeployment.metadata || {};
    newDeployment.metadata.labels = newDeployment.metadata.labels || {};
    newDeployment.metadata.labels[templateDeployKey] = labelName;
  }

  return newDeployment;
};

export function deepSearch(obj: any): string {
  if (has(obj, 'message')) {
    return obj.message;
  }
  for (let key in obj) {
    if (isObject(obj[key])) {
      let message = deepSearch(obj[key]);
      if (message) {
        return message;
      }
    }
  }
  return 'Error';
}

export function getTemplateEnvs(namespace?: string): EnvResponse {
  const TemplateEnvs: EnvResponse = {
    SEALOS_CLOUD_DOMAIN: Config().template.userDomain || Config().cloud.domain,
    SEALOS_CERT_SECRET_NAME: Config().cloud.certSecretName,
    TEMPLATE_REPO_URL: Config().template.repo.url,
    TEMPLATE_REPO_BRANCH: Config().template.repo.branch,
    SEALOS_NAMESPACE: namespace || '',
    SEALOS_SERVICE_ACCOUNT: namespace?.replace('ns-', '') || '',
    SHOW_AUTHOR: String(Config().template.features.showAuthor),
    DESKTOP_DOMAIN: Config().template.desktopDomain,
    CURRENCY_SYMBOL: Config().template.ui.currencySymbol,
    FORCED_LANGUAGE: Config().template.ui.forcedLanguage || 'en'
  };
  return TemplateEnvs;
}
