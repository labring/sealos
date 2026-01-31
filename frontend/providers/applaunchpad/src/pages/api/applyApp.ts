import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import yaml from 'js-yaml';
import { generateOwnerReference, shouldHaveOwnerReference } from '@/utils/deployYaml2Json';

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
    const { k8sApp, applyYamlList, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // Parse all resources from YAML list
    const allResources: any[] = [];
    yamlList.forEach((yamlStr) => {
      const resources = yaml.loadAll(yamlStr).filter((item) => item);
      allResources.push(...resources);
    });

    console.log(allResources, 'allResources');
    // Separate main workload (Deployment or StatefulSet) from dependent resources
    const mainWorkloadIndex = allResources.findIndex(
      (resource) => resource.kind === 'Deployment' || resource.kind === 'StatefulSet'
    );

    if (mainWorkloadIndex === -1) {
      // No main workload found, use legacy flow
      const applyRes = await applyYamlList(yamlList, mode);
      jsonRes(res, { data: applyRes.map((item) => item.kind) });
      return;
    }

    const mainWorkload = allResources[mainWorkloadIndex];
    const dependentResources = allResources.filter((_, index) => index !== mainWorkloadIndex);

    // Phase 1: Create main workload first
    const mainWorkloadYaml = yaml.dump(mainWorkload);

    await applyYamlList([mainWorkloadYaml], mode);

    // Phase 2: Get UID from created workload
    let workloadUid: string;
    try {
      if (mainWorkload.kind === 'Deployment') {
        const deployment = await k8sApp.readNamespacedDeployment(
          mainWorkload.metadata.name,
          namespace
        );
        workloadUid = deployment.body.metadata?.uid || '';
      } else {
        const statefulSet = await k8sApp.readNamespacedStatefulSet(
          mainWorkload.metadata.name,
          namespace
        );
        workloadUid = statefulSet.body.metadata?.uid || '';
      }
    } catch (err) {
      console.error('Failed to get workload UID:', err);
      throw new Error('Failed to get workload UID after creation');
    }

    if (!workloadUid) {
      throw new Error('Workload UID is empty');
    }

    // Phase 3: Add ownerReferences to dependent resources
    const ownerReferences = generateOwnerReference(
      mainWorkload.metadata.name,
      mainWorkload.kind,
      workloadUid
    );

    dependentResources.forEach((resource) => {
      if (shouldHaveOwnerReference(resource.kind)) {
        if (!resource.metadata) {
          resource.metadata = {};
        }
        resource.metadata.ownerReferences = ownerReferences;
      }
    });

    // Phase 4: Create dependent resources
    if (dependentResources.length > 0) {
      const dependentYamlList = dependentResources.map((resource) => yaml.dump(resource));
      await applyYamlList(dependentYamlList, mode);
    }

    const allKinds = [mainWorkload, ...dependentResources].map((item) => item.kind);
    jsonRes(res, { data: allKinds });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, handleK8sError(err));
  }
}
