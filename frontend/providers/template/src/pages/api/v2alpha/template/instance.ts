import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import { mapValues, reduce } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../../getTemplateSource';

interface CreateInstanceRequest {
  name: string;
  template: string;
  args?: Record<string, string>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed'
    });
  }

  try {
    const { name, template: templateName, args = {} } = req.body as CreateInstanceRequest;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        message: 'Instance name is required'
      });
    }

    // Validate instance name format (Kubernetes DNS subdomain name rules)
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    const trimmedName = name.trim();
    if (!k8sNameRegex.test(trimmedName)) {
      return res.status(400).json({
        message:
          'Instance name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens'
      });
    }
    if (trimmedName.length > 63) {
      return res.status(400).json({
        message: 'Instance name must be 63 characters or less'
      });
    }

    if (!templateName || typeof templateName !== 'string' || templateName.trim() === '') {
      return res.status(400).json({
        message: 'Template name is required'
      });
    }

    // Validate kubeconfig
    let kubeconfig: string;
    try {
      kubeconfig = await authSession(req.headers);
    } catch (err) {
      return res.status(401).json({
        message: 'Invalid or missing kubeconfig',
        error: 'Authentication failed'
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
      return res.status(401).json({
        message: 'Invalid kubeconfig or insufficient permissions',
        error: err?.message || 'Failed to authenticate with Kubernetes cluster'
      });
    }

    // Get template info
    const { code, message, dataSource, templateYaml, TemplateEnvs, appYaml } =
      await GetTemplateByName({
        namespace,
        templateName
      });

    if (code !== 20000) {
      return res.status(404).json({
        message: message || `Template '${templateName}' not found`
      });
    }

    if (!dataSource || !templateYaml || !appYaml) {
      return res.status(404).json({
        message: `Template '${templateName}' not found or invalid`
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
      return res.status(400).json({
        message: `Missing required parameters: ${missingRequiredArgs.join(', ')}`
      });
    }

    // Get defaults and override app_name with custom instance name
    const _defaults = mapValues(dataSource.defaults || {}, (value) => value?.value ?? '');
    _defaults['app_name'] = trimmedName;

    // Generate YAML from template
    const generateStr = parseTemplateString(appYaml, {
      ...TemplateEnvs,
      defaults: _defaults,
      inputs: _inputs
    });
    const correctYaml = generateYamlList(generateStr, trimmedName);

    const yamls = correctYaml.map((item) => item.value);

    // Apply to Kubernetes
    try {
      await applyYamlList(yamls, 'create');
    } catch (k8sErr: any) {
      const errMessage = k8sErr?.body?.message || k8sErr?.message || String(k8sErr);

      // 409 Conflict - Resource already exists
      if (errMessage.includes('already exists') || k8sErr?.body?.code === 409) {
        return res.status(409).json({
          message: `Instance '${trimmedName}' already exists`,
          error: errMessage
        });
      }

      // 403 Forbidden - Permission denied
      if (
        errMessage.includes('forbidden') ||
        errMessage.includes('Forbidden') ||
        k8sErr?.body?.code === 403
      ) {
        return res.status(403).json({
          message: 'Permission denied: insufficient privileges to create resources',
          error: errMessage
        });
      }

      // 422 Unprocessable Entity - Invalid resource spec
      if (
        errMessage.includes('invalid') ||
        errMessage.includes('Invalid') ||
        errMessage.includes('admission webhook') ||
        k8sErr?.body?.code === 422
      ) {
        return res.status(422).json({
          message: 'Failed to create instance: invalid resource specification',
          error: errMessage
        });
      }

      // 503 Service Unavailable - K8s cluster unavailable
      if (
        errMessage.includes('ECONNREFUSED') ||
        errMessage.includes('ETIMEDOUT') ||
        errMessage.includes('unavailable') ||
        k8sErr?.body?.code === 503
      ) {
        return res.status(503).json({
          message: 'Kubernetes cluster is temporarily unavailable',
          error: errMessage
        });
      }

      // 500 Internal Server Error - Other K8s errors
      return res.status(500).json({
        message: 'Failed to create instance in Kubernetes',
        error: errMessage
      });
    }

    // Return created instance info
    const instanceResponse = {
      name: trimmedName,
      namespace: namespace,
      template: templateName,
      createTime: new Date().toISOString(),
      icon: templateYaml.spec.icon || '',
      description: templateYaml.spec.description || '',
      gitRepo: templateYaml.spec.gitRepo || '',
      readme: templateYaml.spec.readme || '',
      author: templateYaml.spec.author || '',
      categories: templateYaml.spec.categories || []
    };

    return res.status(201).json(instanceResponse);
  } catch (err: any) {
    console.error('Error creating instance:', err);
    return res.status(500).json({
      message: 'Failed to create instance',
      error: err?.message || err
    });
  }
}
