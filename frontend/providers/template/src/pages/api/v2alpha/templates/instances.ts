import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import {
  generateYamlList,
  handleTemplateToInstanceYaml,
  parseTemplateString
} from '@/utils/json-yaml';
import { mapValues, reduce } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../../getTemplateSource';
import JsYaml from 'js-yaml';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

interface CreateInstanceRequest {
  name: string;
  template: string;
  args?: Record<string, string>;
}

interface ResourceQuota {
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
}

// Convert CPU string to cores (e.g., "500m" -> 0.5, "2" -> 2)
function convertCpuToCores(cpu: string | undefined): number {
  if (!cpu) return 0;
  cpu = String(cpu);
  if (cpu.endsWith('m')) {
    return parseFloat(cpu.slice(0, -1)) / 1000 || 0;
  }
  return parseFloat(cpu) || 0;
}

// Convert memory string to GiB (e.g., "512Mi" -> 0.5, "2Gi" -> 2)
function convertMemoryToGiB(memory: string | undefined): number {
  if (!memory) return 0;
  memory = String(memory);
  const value = parseFloat(memory) || 0;
  const unit = memory.replace(/[0-9.]/g, '');

  switch (unit) {
    case 'Ki':
      return value / (1024 * 1024);
    case 'Mi':
      return value / 1024;
    case 'Gi':
      return value;
    case 'Ti':
      return value * 1024;
    default:
      return value / (1024 * 1024 * 1024); // Assume bytes
  }
}

// Extract quota from a K8s resource
function extractResourceQuota(resource: any): ResourceQuota | undefined {
  const kind = resource?.kind;

  if (kind === 'Deployment' || kind === 'StatefulSet') {
    const replicas = resource?.spec?.replicas || 1;
    const containers = resource?.spec?.template?.spec?.containers || [];

    let totalCpu = 0;
    let totalMemory = 0;
    for (const container of containers) {
      totalCpu += convertCpuToCores(container?.resources?.limits?.cpu);
      totalMemory += convertMemoryToGiB(container?.resources?.limits?.memory);
    }

    let totalStorage = 0;
    const volumeClaimTemplates = resource?.spec?.volumeClaimTemplates || [];
    for (const vct of volumeClaimTemplates) {
      totalStorage += convertMemoryToGiB(vct?.spec?.resources?.requests?.storage);
    }

    return {
      cpu: Number(totalCpu.toFixed(2)),
      memory: Number(totalMemory.toFixed(2)),
      storage: Number(totalStorage.toFixed(2)),
      replicas
    };
  }

  if (kind === 'Cluster') {
    // KubeBlocks Cluster for databases
    const componentSpecs = resource?.spec?.componentSpecs || [];
    let totalCpu = 0;
    let totalMemory = 0;
    let totalStorage = 0;
    let totalReplicas = 0;

    for (const comp of componentSpecs) {
      const replicas = comp?.replicas || 1;
      totalReplicas += replicas;
      totalCpu += convertCpuToCores(comp?.resources?.limits?.cpu) * replicas;
      totalMemory += convertMemoryToGiB(comp?.resources?.limits?.memory) * replicas;
      totalStorage +=
        convertMemoryToGiB(comp?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage) *
        replicas;
    }

    return {
      cpu: Number(totalCpu.toFixed(2)),
      memory: Number(totalMemory.toFixed(2)),
      storage: Number(totalStorage.toFixed(2)),
      replicas: totalReplicas || 1
    };
  }

  // For other resource types, no quota info
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { name, template: templateName, args = {} } = req.body as CreateInstanceRequest;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Instance name is required.',
        details: [{ field: 'name', message: 'Required' }]
      });
    }

    // Validate instance name format (Kubernetes DNS subdomain name rules)
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    const trimmedName = name.trim();
    if (!k8sNameRegex.test(trimmedName)) {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_VALUE,
        message:
          'Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens.'
      });
    }
    if (trimmedName.length > 63) {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_VALUE,
        message: 'Instance name must be 63 characters or less.'
      });
    }

    if (!templateName || typeof templateName !== 'string' || templateName.trim() === '') {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Template name is required.',
        details: [{ field: 'template', message: 'Required' }]
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

    // Get K8s client
    let namespace: string;
    let applyYamlList: (yamlList: string[], type: 'create' | 'replace' | 'dryrun') => Promise<any>;
    try {
      const k8sResult = await getK8s({ kubeconfig });
      namespace = k8sResult.namespace;
      applyYamlList = k8sResult.applyYamlList;
    } catch (err: any) {
      return sendError(res, {
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Invalid kubeconfig or insufficient permissions.',
        details: err?.message || 'Failed to authenticate with Kubernetes cluster'
      });
    }

    // Get template info
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

    if (!dataSource || !templateYaml || !appYaml || !TemplateEnvs) {
      return sendError(res, {
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: `Template '${templateName}' not found or invalid.`
      });
    }

    // Validate required args and merge with defaults
    const templateInputs = dataSource.inputs || [];
    const missingRequiredArgs: string[] = [];

    // Build inputs with defaults
    const _inputs = reduce(
      templateInputs,
      (acc, item) => {
        const providedValue = args[item.key];
        if (providedValue !== undefined && providedValue !== '') {
          // User provided a non-empty value
          acc[item.key] = providedValue;
        } else if (item.default !== undefined && item.default !== '') {
          // Use non-empty default value
          acc[item.key] = item.default;
        } else if (item.required) {
          // Required parameter without value or valid default
          missingRequiredArgs.push(item.key);
        } else {
          // Non-required parameter: use empty default or empty string
          acc[item.key] = item.default ?? '';
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Check for missing required args
    if (missingRequiredArgs.length > 0) {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_VALUE,
        message: `Missing required parameters: ${missingRequiredArgs.join(', ')}.`
      });
    }

    // Get defaults and override app_name with custom instance name
    const _defaults = mapValues(dataSource.defaults || {}, (value) => value?.value ?? '');
    _defaults['app_name'] = trimmedName;

    // Rebuild the prepended Instance document without parsing unresolved template conditionals
    // from the rest of the manifest body.
    let updatedAppYaml: string;
    try {
      const firstDocSeparatorIndex = appYaml.search(/^---\s*$/m);
      if (firstDocSeparatorIndex === -1) {
        return sendError(res, {
          status: 500,
          type: ErrorType.INTERNAL_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to process template YAML: app manifest body not found.'
        });
      }

      const instanceYaml = handleTemplateToInstanceYaml(templateYaml, trimmedName);
      const manifestBody = appYaml.slice(firstDocSeparatorIndex);
      updatedAppYaml = `${JsYaml.dump(instanceYaml)}\n${manifestBody}`;
    } catch (yamlErr: any) {
      console.error('Failed to rebuild Instance YAML:', yamlErr);
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to process template YAML.',
        details: yamlErr?.message || String(yamlErr)
      });
    }

    // Generate YAML from template
    const generateStr = parseTemplateString(updatedAppYaml, {
      ...TemplateEnvs,
      defaults: _defaults,
      inputs: _inputs
    });

    if (!generateStr || generateStr.trim() === '') {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate YAML from template: empty result.'
      });
    }

    const correctYaml = generateYamlList(generateStr, trimmedName);

    if (!correctYaml || correctYaml.length === 0) {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate YAML list from template: no resources generated.'
      });
    }

    const yamls = correctYaml
      .map((item) => item.value)
      .filter((yaml) => yaml && yaml.trim() !== '');

    if (yamls.length === 0) {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate valid YAML: all resources are empty.'
      });
    }

    // Apply to Kubernetes
    let createdResources: any[] = [];
    try {
      createdResources = await applyYamlList(yamls, 'create');
      console.log('createdResources', createdResources);
    } catch (k8sErr: any) {
      const errMessage = k8sErr?.body?.message || k8sErr?.message || String(k8sErr);

      // 409 Conflict - Resource already exists
      if (errMessage.includes('already exists') || k8sErr?.body?.code === 409) {
        return sendError(res, {
          status: 409,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.ALREADY_EXISTS,
          message: `Instance '${trimmedName}' already exists.`,
          details: errMessage
        });
      }

      // 403 Forbidden - Permission denied
      if (
        errMessage.includes('forbidden') ||
        errMessage.includes('Forbidden') ||
        k8sErr?.body?.code === 403
      ) {
        return sendError(res, {
          status: 403,
          type: ErrorType.AUTHORIZATION_ERROR,
          code: ErrorCode.PERMISSION_DENIED,
          message: 'Permission denied: insufficient privileges to create resources.',
          details: errMessage
        });
      }

      // 422 Unprocessable Entity - Invalid resource spec
      if (
        errMessage.includes('invalid') ||
        errMessage.includes('Invalid') ||
        errMessage.includes('admission webhook') ||
        k8sErr?.body?.code === 422
      ) {
        return sendError(res, {
          status: 422,
          type: ErrorType.OPERATION_ERROR,
          code: ErrorCode.INVALID_RESOURCE_SPEC,
          message: 'Failed to create instance: invalid resource specification.',
          details: errMessage
        });
      }

      // 503 Service Unavailable - K8s cluster unavailable
      if (
        errMessage.includes('ECONNREFUSED') ||
        errMessage.includes('ETIMEDOUT') ||
        errMessage.includes('unavailable') ||
        k8sErr?.body?.code === 503
      ) {
        return sendError(res, {
          status: 503,
          type: ErrorType.INTERNAL_ERROR,
          code: ErrorCode.SERVICE_UNAVAILABLE,
          message: 'Kubernetes cluster is temporarily unavailable.',
          details: errMessage
        });
      }

      // 500 Internal Server Error - Other K8s errors
      return sendError(res, {
        status: 500,
        type: ErrorType.OPERATION_ERROR,
        code: ErrorCode.KUBERNETES_ERROR,
        message: 'Failed to create instance in Kubernetes.',
        details: errMessage
      });
    }

    // Return created instance info
    // Only match by kind === 'Instance', do not fallback to name matching (could match wrong resource)
    const instanceResource = createdResources?.find(
      (resource) => resource?.kind === 'Instance' && resource?.apiVersion === 'app.sealos.io/v1'
    );

    // Validate Instance was actually created
    if (!instanceResource) {
      console.error('Instance resource not found in created resources:', createdResources);
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Instance resource was not created successfully.',
        details: 'Instance not found in Kubernetes response'
      });
    }

    const instanceName = instanceResource?.metadata?.name;
    const instanceUid = instanceResource?.metadata?.uid;
    const instanceCreatedAt = instanceResource?.metadata?.creationTimestamp;

    // Validate Instance has required fields
    if (!instanceName) {
      console.error('Instance resource missing name:', instanceResource);
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Instance resource created but missing name.',
        details: 'Invalid Instance resource returned from Kubernetes'
      });
    }

    // Map non-Instance resources
    // All resources in createdResources are already created for this instance, no need to filter by label
    const resources = createdResources
      .filter((resource) => resource?.kind !== 'Instance')
      .map((resource) => {
        const quota = extractResourceQuota(resource);
        const resourceInfo: {
          name: string;
          uid: string;
          resourceType: string;
          quota?: ResourceQuota;
        } = {
          name: resource?.metadata?.name || '',
          uid: resource?.metadata?.uid || '',
          resourceType: resource?.kind?.toLowerCase() || ''
        };
        if (quota) {
          resourceInfo.quota = quota;
        }
        return resourceInfo;
      });

    const instanceResponse = {
      name: instanceName,
      uid: instanceUid || '',
      resourceType: 'instance' as const,
      displayName: '',
      createdAt: instanceCreatedAt || '',
      args: _inputs,
      resources
    };

    console.log('instanceResponse', instanceResponse);
    return res.status(201).json(instanceResponse);
  } catch (err: any) {
    console.error('Error creating instance:', err);
    return sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to create instance.',
      details: err?.message || String(err)
    });
  }
}
