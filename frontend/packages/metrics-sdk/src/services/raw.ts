import { BaseMetricsService } from './base';
import { QueryResponse, RawQueryParams } from '../types/common';

export class RawMetricsService extends BaseMetricsService {
  async query(params: RawQueryParams): Promise<QueryResponse> {
    await this.authService.authenticate(params.namespace);

    const promqlQuery =
      params.injectNamespace === false
        ? params.query
        : this.injectNamespaceLegacy(params.query, params.namespace);

    return this.queryPrometheus<QueryResponse>(promqlQuery, params.range);
  }
}
