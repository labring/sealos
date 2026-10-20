import { BaseQueryParams } from './common';

export type MinioMetric =
  | 'minio_bucket_usage_object_total'
  | 'minio_bucket_usage_total_bytes'
  | 'minio_bucket_traffic_received_bytes'
  | 'minio_bucket_traffic_sent_bytes';

export interface MinioQueryParams extends BaseQueryParams {
  query: MinioMetric;
  app: string;
}
