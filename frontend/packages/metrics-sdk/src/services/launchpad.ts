import { BaseMetricsService } from './base';
import { LaunchpadQueryParams, LaunchpadQueryResult } from '../types/launchpad';
import { LAUNCHPAD_QUERIES } from '../constants/promql';

export class LaunchpadService extends BaseMetricsService {
  private buildQuery(params: LaunchpadQueryParams): string {
    let query: string = LAUNCHPAD_QUERIES[params.type];

    const podName = this.getPodName(params.launchPadName);
    query = query.replace(/\$namespace/g, params.namespace).replace(/\$pod/g, podName);

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
    await this.authService.authenticate(params.namespace);

    const promqlQuery = this.buildQuery(params);
    return this.queryPrometheus<LaunchpadQueryResult>(promqlQuery, params.range);
  }
}
