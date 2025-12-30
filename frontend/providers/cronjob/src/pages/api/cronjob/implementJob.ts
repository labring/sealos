import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobName } = req.body;
  const { namespace, k8sBatch } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const cronJob = await k8sBatch.readNamespacedCronJob(jobName, namespace);
  if (!cronJob.body) {
    throw new Error('CronJob not found');
  }

  const jobSpec = cronJob.body.spec?.jobTemplate.spec;
  const job = {
    metadata: {
      name: `${jobName}-manual-${Date.now()}`,
      namespace: namespace,
      annotations: {
        'cronjob.kubernetes.io/instantiate': 'manual'
      }
    },
    spec: jobSpec
  };

  const response = await k8sBatch.createNamespacedJob(namespace, job);

  jsonRes(res, { data: response.body });
});
