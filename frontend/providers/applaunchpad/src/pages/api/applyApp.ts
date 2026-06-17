import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { getPublicDomainErrorResponse, handleK8sError, jsonRes } from '@/services/backend/response';
import yaml from 'js-yaml';
import { generateOwnerReference, shouldHaveOwnerReference } from '@/utils/deployYaml2Json';
import { appDeployKey } from '@/constants/app';
import {
  getInvalidGeneratedAppNameMessage,
  getInvalidRfc1035ServiceNameMessage
} from '@/utils/appNameValidation';
import {
  ensurePublicDomainTargetsAvailable,
  PublicDomainError,
  PublicDomainTarget
} from '@/services/backend/publicDomain';
import { ResponseCode } from '@/types/response';

type K8sResource = {
  kind?: string;
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
    ownerReferences?: any[];
  };
  spec?: {
    rules?: {
      host?: string;
    }[];
  };
};

type WorkloadResource = K8sResource & {
  kind: 'Deployment' | 'StatefulSet';
};

function isWorkloadResource(resource: K8sResource): resource is WorkloadResource {
  return resource.kind === 'Deployment' || resource.kind === 'StatefulSet';
}

function getManagedDomains() {
  return [
    global.AppConfig?.cloud?.domain,
    ...(global.AppConfig?.cloud?.userDomains || []).map((domain: { name: string }) => domain.name)
  ].filter((domain): domain is string => Boolean(domain));
}

function getPublicDomainTargets(resources: K8sResource[]): PublicDomainTarget[] {
  const workload = resources.find(isWorkloadResource);
  const fallbackAppName = workload?.metadata?.name;
  const managedDomains = getManagedDomains();

  return resources
    .filter((resource) => resource.kind === 'Ingress')
    .flatMap((resource) =>
      (resource.spec?.rules || [])
        .map((rule) => rule.host)
        .filter((host): host is string => typeof host === 'string' && !host.startsWith('*.'))
        .flatMap((host) => {
          const domain = managedDomains.find((item) => host.endsWith(`.${item}`));
          if (!domain) return [];
          return [
            {
              prefix: host.slice(0, -domain.length - 1),
              domain,
              appName: resource.metadata?.labels?.[appDeployKey] || fallbackAppName,
              networkName: resource.metadata?.name
            }
          ];
        })
    );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { yamlList, mode = 'create' }: { yamlList: string[]; mode?: 'create' | 'replace' } =
    req.body;
  if (!yamlList) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }
  try {
    const { k8sApp, k8sNetworkingApp, applyYamlList, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const allResources: K8sResource[] = [];
    yamlList.forEach((yamlStr) => {
      const resources = yaml.loadAll(yamlStr).filter((item): item is K8sResource => Boolean(item));
      allResources.push(...resources);
    });

    const mainWorkloadIndex = allResources.findIndex(isWorkloadResource);
    const invalidAppNameMessage =
      mainWorkloadIndex === -1
        ? undefined
        : getInvalidGeneratedAppNameMessage(allResources[mainWorkloadIndex].metadata?.name);
    if (mode === 'create' && invalidAppNameMessage) {
      jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: invalidAppNameMessage
      });
      return;
    }

    const invalidServiceNameMessage = getInvalidRfc1035ServiceNameMessage(allResources);
    if (invalidServiceNameMessage) {
      jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        message: invalidServiceNameMessage
      });
      return;
    }

    await ensurePublicDomainTargetsAvailable(getPublicDomainTargets(allResources), {
      k8sNetworkingApp,
      namespace
    });

    if (mainWorkloadIndex === -1) {
      const applyRes = await applyYamlList(yamlList, mode);
      jsonRes(res, { data: applyRes.map((item) => item.kind) });
      return;
    }

    const mainWorkload = allResources[mainWorkloadIndex] as WorkloadResource;
    const mainWorkloadName = mainWorkload.metadata?.name;
    if (!mainWorkloadName) {
      throw new Error('Workload metadata.name is required');
    }
    const dependentResources = allResources.filter((_, index) => index !== mainWorkloadIndex);

    const mainWorkloadYaml = yaml.dump(mainWorkload);

    await applyYamlList([mainWorkloadYaml], mode);

    let workloadUid: string;
    try {
      if (mainWorkload.kind === 'Deployment') {
        const deployment = await k8sApp.readNamespacedDeployment(mainWorkloadName, namespace);
        workloadUid = deployment.body.metadata?.uid || '';
      } else {
        const statefulSet = await k8sApp.readNamespacedStatefulSet(mainWorkloadName, namespace);
        workloadUid = statefulSet.body.metadata?.uid || '';
      }
    } catch (err) {
      console.error('Failed to get workload UID:', err);
      throw new Error('Failed to get workload UID after creation');
    }

    if (!workloadUid) {
      throw new Error('Workload UID is empty');
    }

    const ownerReferences = generateOwnerReference(
      mainWorkloadName,
      mainWorkload.kind,
      workloadUid
    );

    dependentResources.forEach((resource) => {
      if (resource.kind && shouldHaveOwnerReference(resource.kind)) {
        if (!resource.metadata) {
          resource.metadata = {};
        }
        resource.metadata.ownerReferences = ownerReferences;
      }
    });

    if (dependentResources.length > 0) {
      const dependentYamlList = dependentResources.map((resource) => yaml.dump(resource));
      await applyYamlList(dependentYamlList, mode);
    }

    const allKinds = [mainWorkload, ...dependentResources].map((item) => item.kind);
    jsonRes(res, { data: allKinds });
  } catch (err: any) {
    console.log(err);
    if (err instanceof PublicDomainError) {
      return jsonRes(res, {
        code: err.status,
        message: err.message,
        error: getPublicDomainErrorResponse(err)
      });
    }
    jsonRes(res, handleK8sError(err));
  }
}
