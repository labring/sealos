import { BaseMetricsService } from './base';
import { DatabaseQueryParams } from '../types/database';
import { QueryResponse } from '../types/common';
import { DATABASE_QUERY_MAP } from '../constants/promql';

export class DatabaseService extends BaseMetricsService {
  private buildQuery(params: DatabaseQueryParams): string {
    const queryMap = DATABASE_QUERY_MAP[params.type];

    if (!queryMap) {
      throw new Error(`Unsupported database type: ${params.type}`);
    }

    const queryTemplate = queryMap[params.query as keyof typeof queryMap];

    if (!queryTemplate) {
      throw new Error(`Unsupported query: ${params.query} for ${params.type}`);
    }

    return queryTemplate.replace(/#/g, params.namespace).replace(/@/g, params.app);
  }

  async query(params: DatabaseQueryParams): Promise<QueryResponse> {
    await this.authService.authenticate(params.namespace);

    const promqlQuery = this.buildQuery(params);
    return this.queryPrometheus<QueryResponse>(promqlQuery, params.range);
  }
}
