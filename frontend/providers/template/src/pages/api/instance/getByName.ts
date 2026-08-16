import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { adaptInstanceListItem } from '@/utils/adapt';
import { TemplateInstanceType } from '@/types/app';
import { MockInstance } from '@/constants/mock';
import { getTemplateEnvs } from '@/utils/tools';
import { proxyTemplateIconUrls } from '@/utils/templateAsset';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { instanceName, mock = 'false' } = req.query as { instanceName: string; mock: string };
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    if (mock === 'true') {
      return jsonRes(res, { data: MockInstance });
    }

    const InstanceCRD: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'instances'
    };

    const result = (await k8sCustomObjects.getNamespacedCustomObject(
      InstanceCRD.group,
      InstanceCRD.version,
      InstanceCRD.namespace,
      InstanceCRD.plural,
      instanceName
    )) as {
      body: TemplateInstanceType;
    };

    const templateEnvs = getTemplateEnvs();
    const templateRepo = {
      url: templateEnvs.TEMPLATE_REPO_URL,
      branch: templateEnvs.TEMPLATE_REPO_BRANCH,
      provider: templateEnvs.TEMPLATE_REPO_PROVIDER
    };

    jsonRes(res, { data: adaptInstanceListItem(proxyTemplateIconUrls(result.body, templateRepo)) });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
