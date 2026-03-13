import { ApiResp, jsonRes } from '@/services/backend/response';
import { sub } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
import { MetricsClient } from 'sealos-metrics-sdk';
import type { MinioMetric } from 'sealos-metrics-sdk';
import type { QueryResponse } from 'sealos-metrics-sdk';

const parseWhitelist = (raw?: string): string[] | undefined => {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value) return undefined;

  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        const list = parsed.map((item) => String(item).trim()).filter(Boolean);
        return list.length > 0 ? list : undefined;
      }
    } catch (error) {
      const list = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      return list.length > 0 ? list : undefined;
    }
  }

  const list = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const client = await initK8s({ req });
    const { bucket } = req.body as { bucket?: string };
    if (!bucket) return jsonRes(res, { code: 400, data: { error: 'bucketName is invaild' } });
    const now = Date.now();
    const queries: MinioMetric[] = [
      'minio_bucket_usage_object_total',
      'minio_bucket_usage_total_bytes',
      'minio_bucket_traffic_received_bytes',
      'minio_bucket_traffic_sent_bytes'
    ];
    const metricsURL = process.env.METRICS_URL;
    const minioInstance = process.env.OBJECT_STORAGE_INSTANCE;
    const whitelistKubernetesHosts = parseWhitelist(process.env.WHITELIST_KUBERNETES_HOSTS);

    const metricsClient = new MetricsClient({
      kubeconfig: client.kc.exportConfig(),
      metricsURL,
      minioInstance,
      whitelistKubernetesHosts
    });

    const range = {
      start: sub(now, { hours: 24 }).getTime() / 1000,
      end: now / 1000,
      step: '1m'
    };

    const responses: QueryResponse[] = await Promise.all(
      queries.map((query) =>
        metricsClient.minio.query({
          query,
          namespace: client.namespace,
          app: bucket,
          range
        })
      )
    );

    if (responses.every((response) => response.status === 'success')) {
      return jsonRes(res, {
        data: responses.map((response: QueryResponse, i: number) => {
          const result = response.data.result as typeof response.data.result & {
            name?: string;
          };
          result.name = queries[i];
          return result;
        })
      });
    }

    return jsonRes(res, { data: responses });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      message: 'get bucket error'
    });
  }
}
