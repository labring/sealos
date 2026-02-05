import { cloneDeep, forEach, isNumber, isBoolean, isObject, has } from 'lodash';
import { templateDeployKey } from '@/constants/keys';
import { EnvResponse } from '@/types';
import { Config } from '@/config';

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

export const processEnvValue = (obj: any, labelName: string) => {
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
    SEALOS_CLOUD_DOMAIN: Config().template.userDomain ?? Config().cloud.domain,
    SEALOS_CERT_SECRET_NAME: Config().cloud.certSecretName,
    TEMPLATE_REPO_URL: Config().template.repo.url,
    TEMPLATE_REPO_BRANCH: Config().template.repo.branch,
    SEALOS_NAMESPACE: namespace || '',
    SEALOS_SERVICE_ACCOUNT: namespace?.replace('ns-', '') || '',
    SHOW_AUTHOR: String(Config().template.features.showAuthor),
    DESKTOP_DOMAIN: Config().template.desktopDomain,
    CURRENCY_SYMBOL: Config().template.ui.currencySymbolType,
    FORCED_LANGUAGE: Config().template.ui.forcedLanguage || 'en'
  };
  return TemplateEnvs;
}
