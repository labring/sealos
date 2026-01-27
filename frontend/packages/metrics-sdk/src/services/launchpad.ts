import { BaseMetricsService } from './base';
import { LaunchpadQueryParams, LaunchpadQueryResult } from '../types/launchpad';
import { LAUNCHPAD_QUERIES } from '../constants/promql';

export class LaunchpadService extends BaseMetricsService {
  private buildQuery(params: LaunchpadQueryParams, namespace: string): string {
    let query: string = LAUNCHPAD_QUERIES[params.type];

    const podName = this.getPodName(params.launchPadName);
    query = query.replace(/\$namespace/g, namespace).replace(/\$pod/g, podName);

    if (params.pvcName) {
      query = query.replace(/@persistentvolumeclaim/g, params.pvcName);
    }

    return query;
  }

  private getPodName(launchPadName: string): string {
    const index = launchPadName.lastIndexOf('-');
    return launchPadName.substring(0, index);
  }

  async query(params: LaunchpadQueryParams): Promise<LaunchpadQueryResult> {
    const namespace = this.resolveNamespace(params.namespace);
    await this.authService.authenticate(namespace);

    const promqlQuery = this.buildQuery(params, namespace);
    return this.queryPrometheus<LaunchpadQueryResult>(promqlQuery, params.range);
  }
}
