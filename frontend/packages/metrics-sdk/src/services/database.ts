import { BaseMetricsService } from './base';
import { DatabaseQueryParams } from '../types/database';
import { QueryResponse, RawQueryParams } from '../types/common';
import { DATABASE_QUERY_MAP } from '../constants/promql';

export class DatabaseService extends BaseMetricsService {
  private buildQuery(params: DatabaseQueryParams, namespace: string): string {
    const queryMap = DATABASE_QUERY_MAP[params.type];

    if (!queryMap) {
      throw new Error(`Unsupported database type: ${params.type}`);
    }

    const queryTemplate = queryMap[params.query as keyof typeof queryMap];

    if (!queryTemplate) {
      throw new Error(`Unsupported query: ${params.query} for ${params.type}`);
    }

    return queryTemplate.replace(/#/g, namespace).replace(/@/g, params.app);
  }

  async query(params: DatabaseQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery = this.buildQuery(params, namespace);
    return this.queryPrometheus<QueryResponse>(promqlQuery, params.range);
  }

  async rawQuery(params: RawQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery =
      params.injectNamespace === false
        ? params.query
        : this.injectNamespaceLegacy(params.query, namespace);

    return this.queryPrometheus<QueryResponse>(promqlQuery, params.range);
  }
}
