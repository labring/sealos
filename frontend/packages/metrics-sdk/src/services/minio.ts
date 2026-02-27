import { BaseMetricsService } from './base';
import { MinioQueryParams } from '../types/minio';
import { QueryResponse } from '../types/common';
import { MINIO_QUERIES } from '../constants/promql';

export class MinioService extends BaseMetricsService {
  private minioInstance: string;

  constructor(baseURL: string, authService: any, minioInstance?: string) {
    super(baseURL, authService);
    this.minioInstance = minioInstance || process.env.OBJECT_STORAGE_INSTANCE || '';
  }

  private buildQuery(params: MinioQueryParams): string {
    const queryTemplate = MINIO_QUERIES[params.query];

    if (!queryTemplate) {
      throw new Error(`Unsupported MinIO query: ${params.query}`);
    }

    return queryTemplate.replace(/#/g, this.minioInstance).replace(/@/g, params.app);
  }

  async query(params: MinioQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery = this.buildQuery(params);
    return this.queryMetrics<QueryResponse>(promqlQuery, params.range);
  }
}
