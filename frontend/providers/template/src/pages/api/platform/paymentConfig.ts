import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import {
  getRuntimeCloudPort,
  getRuntimeCloudDomain,
  getRuntimeDisableHttps,
  getRuntimeHttpPort,
  readRuntimeAppConfig
} from '@/utils/appConfig';

type CostCenterConfigResponse = {
  code: number;
  data?: {
    RECHARGE_ENABLED?: boolean;
    STRIPE_ENABLED?: boolean;
    WECHAT_ENABLED?: boolean;
    ALIPAY_ENABLED?: boolean;
  };
};

export type PaymentConfigResponse = {
  paymentEnabled: boolean;
};

const COSTCENTER_SERVICE_CONFIG_URL =
  'http://costcenter-frontend.costcenter-frontend.svc:3000/api/platform/getAppConfig';
const COSTCENTER_CONFIG_TIMEOUT_MS = 5000;

const getHeaderValue = (value: string | string[] | undefined) => {
  const header = Array.isArray(value) ? value[0] : value;
  return header?.split(',')[0]?.trim() || '';
};

const normalizePort = (value: string) => {
  if (!/^\d+$/.test(value)) return '';
  const port = Number(value);
  return port >= 1 && port <= 65535 ? String(port) : '';
};

const getHostPort = (host: string) => {
  try {
    return new URL(`http://${host}`).port;
  } catch {
    return '';
  }
};

const getExternalConfigUrl = (domain: string, protocol: 'http' | 'https', rawPort: string) => {
  const port = normalizePort(rawPort.trim().replace(/^:/, ''));
  const isDefaultPort =
    (protocol === 'http' && port === '80') || (protocol === 'https' && port === '443');
  const portSuffix = port && !isDefaultPort ? `:${port}` : '';

  return `${protocol}://costcenter.${domain}${portSuffix}/api/platform/getAppConfig`;
};

const getCostCenterConfigUrls = (req: NextApiRequest) => {
  const config = readRuntimeAppConfig();
  const domain = getRuntimeCloudDomain(config);
  const disableHttps = getRuntimeDisableHttps(config);
  const configuredProtocol = disableHttps ? 'http' : 'https';
  const configuredPort = disableHttps ? getRuntimeHttpPort(config) : getRuntimeCloudPort(config);
  const configuredUrl = getExternalConfigUrl(domain, configuredProtocol, configuredPort);

  const forwardedProtocol = getHeaderValue(req.headers['x-forwarded-proto']);
  const requestProtocol =
    forwardedProtocol === 'http' || forwardedProtocol === 'https' ? forwardedProtocol : undefined;
  const forwardedPort = normalizePort(getHeaderValue(req.headers['x-forwarded-port']));
  const hostPort = normalizePort(getHostPort(getHeaderValue(req.headers.host)));
  const requestUrl = requestProtocol
    ? getExternalConfigUrl(domain, requestProtocol, forwardedPort || hostPort)
    : undefined;

  const urls = [COSTCENTER_SERVICE_CONFIG_URL, requestUrl, configuredUrl].filter(
    (url): url is string => !!url
  );
  return [...new Set(urls)];
};

async function getCostCenterConfig(req: NextApiRequest): Promise<CostCenterConfigResponse> {
  let lastError: unknown;

  for (const url of getCostCenterConfigUrls(req)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(COSTCENTER_CONFIG_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`CostCenter config request failed with status ${response.status}`);
      }
      const result = (await response.json()) as CostCenterConfigResponse;
      if (result.code !== 200 || !result.data) {
        throw new Error(`CostCenter config request failed with code ${result.code}`);
      }
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('CostCenter config request failed');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await getCostCenterConfig(req);
    const config = result.data;
    const hasPaymentMethod =
      !!config?.STRIPE_ENABLED || !!config?.WECHAT_ENABLED || !!config?.ALIPAY_ENABLED;

    jsonRes<PaymentConfigResponse>(res, {
      data: {
        paymentEnabled: !!config?.RECHARGE_ENABLED && hasPaymentMethod
      }
    });
  } catch (error) {
    console.log('error: /api/platform/paymentConfig', error);
    jsonRes<PaymentConfigResponse>(res, {
      data: {
        paymentEnabled: false
      }
    });
  }
}
