import { BaseMetricsService } from './base';
import { QueryResponse, RawQueryParams } from '../types/common';

export class RawMetricsService extends BaseMetricsService {
  async query(params: RawQueryParams): Promise<QueryResponse> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery =
      params.injectNamespace === false
        ? params.query
        : this.injectNamespaceLegacy(params.query, namespace);

    return this.queryPrometheus<QueryResponse>(promqlQuery, params.range);
  }
}
