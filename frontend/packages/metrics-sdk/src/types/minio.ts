import { BaseQueryParams } from './common';

export enum MinioMetric {
  BucketUsageObjectTotal = 'minio_bucket_usage_object_total',
  BucketUsageTotalBytes = 'minio_bucket_usage_total_bytes',
  BucketTrafficReceivedBytes = 'minio_bucket_traffic_received_bytes',
  BucketTrafficSentBytes = 'minio_bucket_traffic_sent_bytes'
}

export interface MinioQueryParams extends BaseQueryParams {
  query: MinioMetric;
  type: 'minio';
  app: string;
}
