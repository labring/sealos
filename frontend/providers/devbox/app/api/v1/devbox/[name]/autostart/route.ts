import { NextRequest } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { generateDevboxRbacAndJob } from '@/utils/rbacJobGenerator';
import { AutostartRequestSchema } from './schema';

export const dynamic = 'force-dynamic';

const is404Error = (error: any): boolean => {
  return error.response?.statusCode === 404 || error.statusCode === 404;
};

// wait deletion
const waitForResourceDeletion = async (
  checkFn: () => Promise<any>,
  resourceName: string,
  maxRetries = 30,
  intervalMs = 1000
): Promise<boolean> => {
  console.log(`Waiting for ${resourceName} to be completely deleted...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkFn();
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error: any) {
      if (is404Error(error)) {
        console.log(`${resourceName} successfully deleted`);
        return true;
      }
      throw error;
    }
  }
  
  return false;
};

// check resource 
const checkResourceExists = async (
  checkFn: () => Promise<any>,
  resourceName: string
): Promise<boolean> => {
  try {
    await checkFn();
    console.log(`${resourceName} already exists, skipping`);
    return true;
  } catch (error: any) {
    if (is404Error(error)) {
      return false;
    }
    throw error;
  }
};

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const requestText = await req.text();
    const body = requestText.trim() ? JSON.parse(requestText) : {};
    
    const validationResult = AutostartRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const { execCommand } = validationResult.data || {};
    const devboxName = params.name;

    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(devboxName)) {
      return jsonRes({
        code: 400,
        message: 'Invalid devbox name format'
      });
    }

    const { 
      applyYamlList, 
      delYamlList,
      k8sCustomObjects, 
      k8sCore,
      k8sAuth,
      k8sBatch,
      namespace 
    } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { body: devboxBody } = await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    ) as { body: any };

    if (!devboxBody.metadata?.uid) {
      return jsonRes({
        code: 404,
        message: 'Devbox not found'
      });
    }

    //  RBAC and Job YAML
    const [serviceAccountYaml, roleYaml, roleBindingYaml, jobYaml] = generateDevboxRbacAndJob({
      devboxName,
      devboxNamespace: namespace,
      devboxUID: devboxBody.metadata.uid,
      execCommand
    });

    const executorName = `${devboxName}-executor`;
    const roleName = `${executorName}-role`;
    const roleBindingName = `${executorName}-binding`;
    const jobName = `${devboxName}-exec-job`;

    const yamlsToApply: string[] = [];

    // check and collect RBAC resources
    const resources = [
      { 
        checkFn: () => k8sCore.readNamespacedServiceAccount(executorName, namespace),
        yaml: serviceAccountYaml,
        name: 'ServiceAccount'
      },
      { 
        checkFn: () => k8sAuth.readNamespacedRole(roleName, namespace),
        yaml: roleYaml,
        name: 'Role'
      },
      { 
        checkFn: () => k8sAuth.readNamespacedRoleBinding(roleBindingName, namespace),
        yaml: roleBindingYaml,
        name: 'RoleBinding'
      }
    ];

    for (const resource of resources) {
      const exists = await checkResourceExists(resource.checkFn, resource.name);
      if (!exists) {
        yamlsToApply.push(resource.yaml);
      }
    }

    // if exists, delete and wait, then recreate
    let jobDeleted = false;
    const jobExists = await checkResourceExists(
      () => k8sBatch.readNamespacedJob(jobName, namespace),
      'Job'
    );

    if (jobExists) {
      console.log('Job exists, deleting before recreating');
      await delYamlList([jobYaml]);
      jobDeleted = true;
      
      const deleted = await waitForResourceDeletion(
        () => k8sBatch.readNamespacedJob(jobName, namespace),
        'Job'
      );
      
      if (!deleted) {
        return jsonRes({
          code: 408,
          message: 'Timeout waiting for previous Job to be deleted. Please try again in a few seconds.'
        });
      }
    }

    yamlsToApply.push(jobYaml);

    if (yamlsToApply.length > 0) {
      await applyYamlList(yamlsToApply, 'create');
    }

    return jsonRes({
      data: {
        devboxName,
        autostartCreated: true,
        jobRecreated: jobDeleted,
        resources: [executorName, roleName, roleBindingName, jobName]
      }
    });

  } catch (err: any) {
    if (is404Error(err)) {
      return jsonRes({
        code: 404,
        message: 'Devbox not found'
      });
    }

    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}