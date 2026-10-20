import { BaseMetricsService } from './base';
import { DatabaseQueryParams } from '../types/database';
import { QueryResponse, RawQueryParams } from '../types/common';
import { DATABASE_QUERY_MAP } from '../constants/promql';

export class DatabaseService extends BaseMetricsService {
  private buildQuery(params: DatabaseQueryParams, namespace: string): string {
    if (!params.app?.trim()) throw new Error('app is required');
    const queryMap = DATABASE_QUERY_MAP[params.type];

    if (!Object.prototype.hasOwnProperty.call(DATABASE_QUERY_MAP, params.type)) {
      throw new Error(`Unsupported database type: ${params.type}`);
    }

    const queryTemplate = queryMap[params.query as keyof typeof queryMap];

    if (!Object.prototype.hasOwnProperty.call(queryMap, params.query)) {
      throw new Error(`Unsupported query: ${params.query} for ${params.type}`);
    }

    return queryTemplate.replace(/#/g, namespace).replace(/@/g, params.app);
  }

  async query(params: DatabaseQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    const promqlQuery = this.buildQuery(params, namespace);
    await this.authService.authenticate(namespace);
    return this.queryMetrics<QueryResponse>(promqlQuery, params.range);
  }

  async rawQuery(params: RawQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery =
      params.injectNamespace === false
        ? params.query
        : this.injectNamespaceLegacy(params.query, namespace);

    return this.queryMetrics<QueryResponse>(promqlQuery, params.range);
  }
}
