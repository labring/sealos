import * as k8s from '@kubernetes/client-node';
import { K8sApi } from './kubernetes';

export const DATAFLOW_APP_NAMESPACE = 'app-system';
export const DATAFLOW_APP_NAME = 'dataflow';
export const DATAFLOW_HEALTH_URL_ANNOTATION = 'dataflow.sealos.io/health-url';
export const DATAFLOW_HEALTH_TIMEOUT_MS = 1200;

type DataflowApp = {
  metadata?: {
    annotations?: Record<string, string>;
  };
};

type HealthResponse = {
  ok: boolean;
  status: number;
};

type Logger = Pick<Console, 'warn'>;

type ResolveDataflowEnabledOptions = {
  readDataflowApp?: () => Promise<DataflowApp | null>;
  fetchHealth?: (url: string) => Promise<HealthResponse>;
  logger?: Logger;
};

const isNotFoundError = (error: any) =>
  error?.response?.statusCode === 404 ||
  error?.statusCode === 404 ||
  error?.body?.code === 404 ||
  error?.body?.reason === 'NotFound';

const readDataflowAppFromCluster = async (): Promise<DataflowApp | null> => {
  const kc = K8sApi();
  const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

  try {
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'app.sealos.io',
      'v1',
      DATAFLOW_APP_NAMESPACE,
      'apps',
      DATAFLOW_APP_NAME
    )) as { body: DataflowApp };

    return body;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const fetchHealthWithTimeout = async (url: string): Promise<HealthResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATAFLOW_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    return {
      ok: response.ok,
      status: response.status
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveDataflowEnabled = async ({
  readDataflowApp = readDataflowAppFromCluster,
  fetchHealth = fetchHealthWithTimeout,
  logger = console
}: ResolveDataflowEnabledOptions = {}): Promise<boolean> => {
  let dataflowApp: DataflowApp | null;

  try {
    dataflowApp = await readDataflowApp();
  } catch (error) {
    logger.warn('[dataflow] Failed to read app-system/dataflow App CR', error);
    return false;
  }

  if (!dataflowApp) {
    return false;
  }

  const healthUrl = dataflowApp.metadata?.annotations?.[DATAFLOW_HEALTH_URL_ANNOTATION]?.trim();

  if (!healthUrl) {
    logger.warn(
      `[dataflow] App CR is missing ${DATAFLOW_HEALTH_URL_ANNOTATION} annotation; hiding DataFlow entry`
    );
    return false;
  }

  try {
    const health = await fetchHealth(healthUrl);

    if (health.ok) {
      return true;
    }

    logger.warn(`[dataflow] Health check returned status ${health.status}; hiding DataFlow entry`);
    return false;
  } catch (error) {
    logger.warn('[dataflow] Health check failed; hiding DataFlow entry', error);
    return false;
  }
};
