import { LaunchpadService } from './services/launchpad';
import { DatabaseService } from './services/database';
import { MinioService } from './services/minio';
import { RawMetricsService } from './services/raw';
import { AuthService } from './auth/auth';

export interface MetricsClientConfig {
  kubeconfig: string;
  metricsURL?: string;
  minioInstance?: string;
  whitelistKubernetesHosts?: string[];
  authCacheTTL?: number;
}

export class MetricsClient {
  public launchpad: LaunchpadService;
  public database: DatabaseService;
  public minio: MinioService;
  public raw: RawMetricsService;
  private authService: AuthService;

  constructor(config: MetricsClientConfig) {
    const defaultURL =
      'http://vmselect-vm-stack-victoria-metrics-k8s-stack.vm.svc.cluster.local:8481/select/0/prometheus';
    const metricsURL = config.metricsURL || process.env.METRICS_URL || defaultURL;

    this.authService = new AuthService(
      config.kubeconfig,
      config.whitelistKubernetesHosts,
      config.authCacheTTL
    );

    this.launchpad = new LaunchpadService(metricsURL, this.authService);
    this.database = new DatabaseService(metricsURL, this.authService);
    this.minio = new MinioService(metricsURL, this.authService, config.minioInstance);
    this.raw = new RawMetricsService(metricsURL, this.authService);
  }
}
