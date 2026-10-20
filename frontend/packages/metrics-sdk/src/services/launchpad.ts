import { BaseMetricsService } from './base';
import { LaunchpadQueryParams, LaunchpadQueryResult } from '../types/launchpad';
import { LAUNCHPAD_QUERIES } from '../constants/promql';

export class LaunchpadService extends BaseMetricsService {
  private buildQuery(params: LaunchpadQueryParams, namespace: string): string {
    const type = params.type === 'storage' ? 'disk' : params.type;
    if (!Object.prototype.hasOwnProperty.call(LAUNCHPAD_QUERIES, type)) {
      throw new Error(`Unsupported launchpad metric: ${params.type}`);
    }
    let query: string = LAUNCHPAD_QUERIES[type];

    if (type === 'network_service_request_count' || type === 'network_service_request_percent') {
      const port = String(params.port ?? '');
      if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
        throw new Error('A valid port (1-65535) is required for network metrics');
      }
      const service = params.service?.trim();
      if (!service) throw new Error('service is required for network metrics');
      const parts = service.split('.');
      const namePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
      if (
        !parts.every((part) => namePattern.test(part)) ||
        (parts.length > 1 && parts[1] !== namespace) ||
        ![1, 2, 3, 5].includes(parts.length) ||
        (parts.length >= 3 && parts[2] !== 'svc') ||
        (parts.length === 5 && parts.slice(3).join('.') !== 'cluster.local')
      ) {
        throw new Error('service must identify a Service in the authenticated namespace');
      }
      const fqdn = `${parts[0]}.${namespace}.svc.cluster.local`;
      return query.replace('$cluster', `outbound|${Number(port)}||${fqdn}`);
    }

    if (type === 'disk') {
      if (!params.pvcName?.trim()) throw new Error('pvcName is required for disk/storage metrics');
      return query
        .replace(/\$namespace/g, namespace)
        .replace(/@persistentvolumeclaim/g, () => params.pvcName!);
    }

    const podName = params.podName?.trim();
    if (!podName) throw new Error('podName is required for this metric');
    const index = podName.lastIndexOf('-');
    const prefix = index === -1 ? podName : podName.substring(0, index);
    query = query.replace(/\$namespace/g, namespace).replace(/\$pod/g, () => prefix);
    return query;
  }

  async query(params: LaunchpadQueryParams): Promise<LaunchpadQueryResult> {
    const namespace = this.resolveNamespace(params.namespace);
    const promqlQuery = this.buildQuery(params, namespace);
    await this.authService.authenticate(namespace);
    return this.queryMetrics<LaunchpadQueryResult>(promqlQuery, params.range);
  }
}
