import { LaunchpadService } from './services/launchpad';
import { DatabaseService } from './services/database';
import { MinioService } from './services/minio';
import { RawMetricsService } from './services/raw';
import { AuthService } from './auth/auth';
import { MetricsAuthConfig } from './types/common';

export interface MetricsClientConfig {
  kubeconfig: string;
  metricsURL?: string;
  metricsAuth: MetricsAuthConfig;
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
    const defaultURL = 'http://vmauth-auth.vm.svc:8427/prometheus';
    const metricsURL = config.metricsURL || process.env.METRICS_URL || defaultURL;

    this.authService = new AuthService(
      config.kubeconfig,
      config.whitelistKubernetesHosts,
      config.authCacheTTL
    );

    this.launchpad = new LaunchpadService(metricsURL, this.authService, config.metricsAuth);
    this.database = new DatabaseService(metricsURL, this.authService, config.metricsAuth);
    this.minio = new MinioService(
      metricsURL,
      this.authService,
      config.metricsAuth,
      config.minioInstance
    );
    this.raw = new RawMetricsService(metricsURL, this.authService, config.metricsAuth);
  }
}
