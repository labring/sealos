import { BaseMetricsService } from './base';
import { LaunchpadQueryParams, LaunchpadQueryResult } from '../types/launchpad';
import { LAUNCHPAD_QUERIES } from '../constants/promql';

export class LaunchpadService extends BaseMetricsService {
  private buildQuery(params: LaunchpadQueryParams, namespace: string): string {
    let query: string = LAUNCHPAD_QUERIES[params.type];

    const podRsPrefix = this.getPodRsPrefix(params.podName);
    query = query.replace(/\$namespace/g, namespace).replace(/\$pod/g, podRsPrefix);

    if (params.pvcName) {
      query = query.replace(/@persistentvolumeclaim/g, params.pvcName);
    }

    return query;
  }

  // input(<deploy>-<rs-hash>-<pod-suffix>): my-app-7c9b8f6d9c-abcde
  // output(<deploy>-<rs-hash>): my-app-7c9b8f6d9c
  private getPodRsPrefix(podName: string): string {
    const index = podName.lastIndexOf('-');
    return podName.substring(0, index);
  }

  async query(params: LaunchpadQueryParams): Promise<LaunchpadQueryResult> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery = this.buildQuery(params, namespace);
    return this.queryMetrics<LaunchpadQueryResult>(promqlQuery, params.range);
  }
}
