import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import {
  generateYamlList,
  getTemplateDataSource,
  getYamlTemplate,
  handleTemplateToInstanceYaml,
  parseTemplateString,
  parseTemplateVariable
} from '@/utils/json-yaml';
import { getTemplateEnvs } from '@/utils/common';
import { mapValues, reduce } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import JsYaml from 'js-yaml';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

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
    const {
      yaml,
      args = {},
      dryRun = false
    } = req.body as {
      yaml?: string;
      args?: Record<string, string>;
      dryRun?: boolean;
    };

    // Validate required yaml field
    if (!yaml || typeof yaml !== 'string' || yaml.trim() === '') {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Template YAML is required.',
        details: [{ field: 'yaml', message: 'Required' }]
      });
    }

    // Auth
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

    // K8s client
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

    // Parse YAML — validates that first doc is kind: Template
    let appYaml: string;
    let templateYaml: any;
    try {
      const parsed = getYamlTemplate(yaml);
      appYaml = parsed.appYaml;
      templateYaml = parsed.templateYaml;
    } catch (parseErr: any) {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_VALUE,
        message:
          parseErr?.message || 'Invalid template YAML: first document must be kind: Template.'
      });
    }

    // Platform envs
    const TemplateEnvs = getTemplateEnvs(namespace);

    // Resolve template variables (${{ random(8) }}, ${{ SEALOS_CLOUD_DOMAIN }}, etc.)
    templateYaml = parseTemplateVariable(templateYaml, TemplateEnvs);

    // Extract data source (defaults + inputs)
    const dataSource = getTemplateDataSource(templateYaml);

    // Validate app_name
    const instanceName = dataSource?.defaults?.app_name?.value;
    if (!instanceName || instanceName.trim() === '') {
      return sendError(res, {
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_VALUE,
        message: 'Template must define a non-empty spec.defaults.app_name value.'
      });
    }

    // Build _defaults (flatten {type, value} to string map); do NOT override app_name
    const _defaults = mapValues(dataSource.defaults || {}, (v) => v?.value ?? '');

    // Validate inputs and build _inputs
    const templateInputs = dataSource.inputs || [];

    const _inputs = reduce(
      templateInputs,
      (acc, item) => {
        const providedValue = args[item.key];
        if (providedValue !== undefined && providedValue !== '') {
          acc[item.key] = providedValue;
        } else if (item.default !== undefined && item.default !== '') {
          acc[item.key] = item.default;
        } else {
          acc[item.key] = item.default ?? '';
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Create Instance YAML and prepend to appYaml
    const instanceYaml = handleTemplateToInstanceYaml(templateYaml, instanceName);
    const fullAppYaml = `${JsYaml.dump(instanceYaml)}\n---\n${appYaml}`;

    // Resolve all ${{ }} template strings
    const generateStr = parseTemplateString(fullAppYaml, {
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

    // Generate YAML list with templateDeployKey labels
    const correctYaml = generateYamlList(generateStr, instanceName);

    if (!correctYaml || correctYaml.length === 0) {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate YAML list from template: no resources generated.'
      });
    }

    const yamls = correctYaml.map((item) => item.value).filter((y) => y && y.trim() !== '');

    if (yamls.length === 0) {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to generate valid YAML: all resources are empty.'
      });
    }

    // Internal dry-run (always) — validates against K8s API before committing
    let dryRunResources: any[] = [];
    try {
      dryRunResources = await applyYamlList(yamls, 'dryrun');
    } catch (k8sErr: any) {
      const errMessage = k8sErr?.body?.message || k8sErr?.message || String(k8sErr);

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
          message: 'Template validation failed: invalid resource specification.',
          details: errMessage
        });
      }

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

      return sendError(res, {
        status: 500,
        type: ErrorType.OPERATION_ERROR,
        code: ErrorCode.KUBERNETES_ERROR,
        message: 'Failed to validate template in Kubernetes.',
        details: errMessage
      });
    }

    // If dryRun === true, return preview (nothing was created)
    if (dryRun === true) {
      const previewResources = (dryRunResources || [])
        .filter((r: any) => !(r?.kind === 'Instance' && r?.apiVersion === 'app.sealos.io/v1'))
        .map((r: any) => {
          const quota = extractResourceQuota(r);
          const info: {
            name: string;
            uid: string;
            resourceType: string;
            quota?: ResourceQuota;
          } = {
            name: r?.metadata?.name || '',
            uid: r?.metadata?.uid || '',
            resourceType: r?.kind?.toLowerCase() || ''
          };
          if (quota) info.quota = quota;
          return info;
        });

      return res.status(200).json({
        name: instanceName,
        resourceType: 'instance' as const,
        dryRun: true as const,
        args: _inputs,
        resources: previewResources
      });
    }

    // Full deploy — apply resources to Kubernetes
    let createdResources: any[] = [];
    try {
      createdResources = await applyYamlList(yamls, 'create');
    } catch (k8sErr: any) {
      const errMessage = k8sErr?.body?.message || k8sErr?.message || String(k8sErr);

      if (errMessage.includes('already exists') || k8sErr?.body?.code === 409) {
        return sendError(res, {
          status: 409,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.ALREADY_EXISTS,
          message: `Instance '${instanceName}' already exists.`,
          details: errMessage
        });
      }

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

      return sendError(res, {
        status: 500,
        type: ErrorType.OPERATION_ERROR,
        code: ErrorCode.KUBERNETES_ERROR,
        message: 'Failed to create instance in Kubernetes.',
        details: errMessage
      });
    }

    // Find Instance resource in created resources
    const instanceResource = createdResources?.find(
      (r) => r?.kind === 'Instance' && r?.apiVersion === 'app.sealos.io/v1'
    );

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

    const createdName = instanceResource?.metadata?.name;
    if (!createdName) {
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Instance resource created but missing name.',
        details: 'Invalid Instance resource returned from Kubernetes'
      });
    }

    const resources = createdResources
      .filter((r) => !(r?.kind === 'Instance' && r?.apiVersion === 'app.sealos.io/v1'))
      .map((r) => {
        const quota = extractResourceQuota(r);
        const info: {
          name: string;
          uid: string;
          resourceType: string;
          quota?: ResourceQuota;
        } = {
          name: r?.metadata?.name || '',
          uid: r?.metadata?.uid || '',
          resourceType: r?.kind?.toLowerCase() || ''
        };
        if (quota) info.quota = quota;
        return info;
      });

    return res.status(201).json({
      name: createdName,
      uid: instanceResource?.metadata?.uid || '',
      resourceType: 'instance' as const,
      displayName: '',
      createdAt: instanceResource?.metadata?.creationTimestamp || '',
      args: _inputs,
      resources
    });
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
