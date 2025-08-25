import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import yaml from 'js-yaml';
import { adaptPod } from '@/utils/adapt';

export const json2HaConfig = ({
  name,
  namespace,
  enable
}: {
  name: string;
  namespace: string;
  enable: string;
}) => {
  const template = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      annotations: {
        MaxLagOnSwitchover: '0',
        enable: enable,
        ttl: '5'
      },
      labels: {
        'app.kubernetes.io/instance': name,
        'app.kubernetes.io/managed-by': 'kubeblocks',
        'apps.kubeblocks.io/component-name': 'mongodb'
      },
      name: `${name}-mongodb-haconfig`,
      namespace: namespace
    }
  };
  return yaml.dump(template);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.body as {
      name: string;
    };
    const { applyYamlList, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const yaml = json2HaConfig({
      name,
      namespace,
      enable: 'true'
    });
    const result = await applyYamlList([yaml], 'update');

    const startTime = Date.now();
    let allItemsStarted = false;
    const pollingTime = 5 * 60 * 1000;
    const pollingInterval = 30 * 1000;
    let pollTimeout: NodeJS.Timeout;

    const pollStatus = async () => {
      const pods = await k8sCore
        .listNamespacedPod(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          `app.kubernetes.io/instance=${name}`
        )
        .then((res) => res.body.items.map(adaptPod));

      allItemsStarted = pods.every((item) => {
        return item.status.every((i) => i.started);
      });

      if (allItemsStarted) {
        const yaml = json2HaConfig({
          name,
          namespace,
          enable: 'false'
        });
        const result = await applyYamlList([yaml], 'update');
        clearTimeout(pollTimeout);
      }

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < pollingTime) {
        pollTimeout = setTimeout(pollStatus, pollingInterval);
      } else {
        const yaml = json2HaConfig({
          name,
          namespace,
          enable: 'false'
        });
        const result = await applyYamlList([yaml], 'update');
      }
    };

    pollTimeout = setTimeout(pollStatus, 1 * 60 * 1000);

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
