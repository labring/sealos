import { LaunchpadService } from './services/launchpad';
import { DatabaseService } from './services/database';
import { MinioService } from './services/minio';
import { AuthService } from './auth/auth';

export interface MetricsClientConfig {
  kubeconfig: string;
  metricsURL?: string;
  minioInstance?: string;
}

export class MetricsClient {
  public launchpad: LaunchpadService;
  public database: DatabaseService;
  public minio: MinioService;
  private authService: AuthService;

  constructor(config: MetricsClientConfig) {
    const defaultURL = 'http://vmsingle-victoria-metrics-k8s-stack.vm.svc.cluster.local:8429';
    const metricsURL = config.metricsURL || process.env.METRICS_URL || defaultURL;

    this.authService = new AuthService(config.kubeconfig);

    this.launchpad = new LaunchpadService(metricsURL, this.authService);
    this.database = new DatabaseService(metricsURL, this.authService);
    this.minio = new MinioService(metricsURL, this.authService, config.minioInstance);
  }
}
