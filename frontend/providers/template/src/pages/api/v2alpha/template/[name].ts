import { generateYamlData, getTemplateDefaultValues } from '@/utils/template';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getResourceUsage, ResourceUsage } from '@/utils/usage';
import { GetTemplateByName } from '../../getTemplateSource';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import { mapValues, reduce } from 'lodash';
import { applyWithInstanceOwnerReferences } from '@/services/backend/instanceOwnerReferencesApply';
import {
  getCachedTemplates,
  getTemplateFromCache,
  getCachedTemplateDetail,
  setCachedTemplateDetail
} from './templateCache';
import { Config } from '@/config';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

// estimate min—max equality
function simplifyResourceValue(
  resource: { min: number; max: number },
  divisor: number = 1
): number | { min: number; max: number } {
  const convertedMin = Number((resource.min / divisor).toFixed(2));
  const convertedMax = Number((resource.max / divisor).toFixed(2));
  return convertedMin === convertedMax ? convertedMax : { min: convertedMin, max: convertedMax };
}

//transform resource/1000
function simplifyResourceUsage(resource: ResourceUsage) {
  return {
    cpu: simplifyResourceValue(resource.cpu, 1000),
    memory: simplifyResourceValue(resource.memory, 1024),
    storage: simplifyResourceValue(resource.storage, 1024),
    nodeport: resource.nodeport
  };
}
type ResourceValue = number | { min: number; max: number } | string | null | undefined;
type ResourceLike = Partial<Record<'cpu' | 'memory' | 'storage', ResourceValue>> & {
  nodeport?: number | string | null;
};

//convert resource to number
function toNumberValue(value: ResourceValue): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    if (typeof value.max === 'number' && !Number.isNaN(value.max)) return value.max;
    if (typeof value.min === 'number' && !Number.isNaN(value.min)) return value.min;
  }
  return 0;
}

//convert nodeport to number
function normalizeNodeport(value: ResourceLike['nodeport']): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

//normalize resource
function normalizeQuota(resource?: ResourceLike | null) {
  return {
    cpu: toNumberValue(resource?.cpu),
    memory: toNumberValue(resource?.memory),
    storage: toNumberValue(resource?.storage),
    nodeport: normalizeNodeport(resource?.nodeport)
  };
}

//handle main function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name: templateName } = req.query as { name: string };
  const language = (req.query.language as string) || 'en';

  // Skip dynamic route for 'instance' - let instance.ts handle it
  if (templateName === 'instance') {
    // This should not happen as static routes have priority, but just in case
    const instanceHandler = await import('./instance');
    return instanceHandler.default(req, res);
  }

  if (!templateName) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Template name is required.'
    });
  }

  // Add caching headers for GET requests
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('ETag', `"${templateName}-${language}"`);
  }

  if (req.method === 'POST') {
    return handleTemplateDeployment(req, res, templateName);
  }

  if (req.method === 'GET') {
    return handleTemplateDetails(req, res, templateName, language);
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use GET or POST.'
  });
}

//post template
async function handleTemplateDeployment(
  req: NextApiRequest,
  res: NextApiResponse,
  templateName: string
) {
  try {
    // Directly receive parameters object without 'args' key
    const args = req.body as Record<string, string>;

    if (!args || typeof args !== 'object' || Object.keys(args).length === 0) {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Template parameters are required.'
      });
    }

    // Validate kubeconfig
    let kubeconfig: string;
    try {
      kubeconfig = await authSession(req.headers);
    } catch (err) {
      return sendError(res, {
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Invalid or missing kubeconfig.'
      });
    }

    // Validate kubeconfig and get K8s client
    let namespace: string;
    let applyYamlList: (yamlList: string[], type: 'create' | 'replace' | 'dryrun') => Promise<any>;
    let k8sCustomObjects: Awaited<ReturnType<typeof getK8s>>['k8sCustomObjects'];
    try {
      const k8sResult = await getK8s({ kubeconfig });
      namespace = k8sResult.namespace;
      applyYamlList = k8sResult.applyYamlList;
      k8sCustomObjects = k8sResult.k8sCustomObjects;
    } catch (err: any) {
      return sendError(res, {
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Invalid kubeconfig or insufficient permissions.',
        details: err?.message || 'Failed to authenticate with Kubernetes cluster'
      });
    }

    const { code, message, dataSource, templateYaml, TemplateEnvs, appYaml } =
      await GetTemplateByName({
        namespace,
        templateName
      });

    if (code !== 20000) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: message || `Template '${templateName}' not found.`
      });
    }

    const app_name = dataSource?.defaults?.app_name?.value || templateName;
    const _defaults = mapValues(dataSource?.defaults, (value) => value.value);
    const _inputs = reduce(
      dataSource?.inputs,
      (acc, item) => {
        acc[item.key] = item.default;
        return acc;
      },
      {} as Record<string, string>
    );

    const generateStr = parseTemplateString(appYaml || '', {
      ...TemplateEnvs,
      defaults: _defaults,
      inputs: { ..._inputs, ...args }
    });
    const correctYaml = generateYamlList(generateStr, app_name);

    const yamls = correctYaml.map((item) => item.value);

    await applyWithInstanceOwnerReferences(
      { applyYamlList, k8sCustomObjects, namespace },
      yamls,
      'create'
    );

    return res.status(204).end();
  } catch (err: any) {
    console.error('Error deploying template:', err);
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to deploy template.',
      details: err?.message || String(err)
    });
  }
}

//get template details
async function handleTemplateDetails(
  req: NextApiRequest,
  res: NextApiResponse,
  templateName: string,
  language: string
) {
  try {
    const originalPath = process.cwd();
    const jsonPath = path.resolve(originalPath, 'templates.json');

    if (!fs.existsSync(jsonPath)) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Templates catalog not found.'
      });
    }
    getCachedTemplates(jsonPath, Config().template.cdnHost, [], language);
    const template = getTemplateFromCache(templateName);

    if (!template) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Template '${templateName}' not found.`
      });
    }

    const i18nData = template.spec?.i18n?.[language];

    let simplifiedResource = null;
    const cacheKey = `${templateName}-${language}`;

    // Check cache first
    simplifiedResource = getCachedTemplateDetail(cacheKey);

    if (simplifiedResource === null) {
      try {
        const templateDetail = await GetTemplateByName({
          namespace: '',
          templateName,
          locale: language,
          includeReadme: 'false'
        });

        if (
          templateDetail.code === 20000 &&
          templateDetail.templateYaml &&
          templateDetail.appYaml &&
          templateDetail.TemplateEnvs
        ) {
          const templateSource = {
            source: {
              ...templateDetail.dataSource,
              ...templateDetail.TemplateEnvs
            },
            appYaml: templateDetail.appYaml,
            templateYaml: templateDetail.templateYaml
          };

          const renderedYaml = generateYamlData(
            templateSource,
            getTemplateDefaultValues(templateSource),
            templateDetail.TemplateEnvs
          );

          const resourceUsage = getResourceUsage(renderedYaml.map((item) => item.value));
          simplifiedResource = simplifyResourceUsage(resourceUsage);

          // Cache the result using shared cache
          setCachedTemplateDetail(cacheKey, simplifiedResource);
        }
      } catch (error) {
        console.error('Error getting template details:', error);
      }
    }
    if (!simplifiedResource && template.spec.requirements) {
      const staticReq = template.spec.requirements as any;
      if (staticReq.cpu && typeof staticReq.cpu === 'object' && 'min' in staticReq.cpu) {
        simplifiedResource = simplifyResourceUsage(staticReq as ResourceUsage);
      } else {
        simplifiedResource = staticReq;
      }
    }

    const result = {
      name: template.metadata.name,
      resourceType: 'template',
      quota: normalizeQuota(simplifiedResource),
      readme: i18nData?.readme || template.spec.readme || '',
      icon: i18nData?.icon || template.spec.icon || '',
      description: i18nData?.description || template.spec.description || '',
      gitRepo: template.spec.gitRepo || '',
      category: template.spec.categories || [],
      args: template.spec.inputs || {},
      deployCount: template.spec.deployCount || 0
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in template detail API:', error);
    sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to get template details.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
