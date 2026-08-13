import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

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

const getCostCenterDomain = () =>
  process.env.SEALOS_CLOUD_DOMAIN || process.env.DESKTOP_DOMAIN || 'cloud.sealos.io';

const normalizePort = (value: string) => {
  if (!/^\d+$/.test(value)) return '';
  const port = Number(value);
  return port >= 1 && port <= 65535 ? String(port) : '';
};

const getExternalConfigUrl = (domain: string, protocol: 'http' | 'https', rawPort: string) => {
  const port = normalizePort(rawPort.trim().replace(/^:/, ''));
  const isDefaultPort =
    (protocol === 'http' && port === '80') || (protocol === 'https' && port === '443');
  const portSuffix = port && !isDefaultPort ? `:${port}` : '';

  return `${protocol}://costcenter.${domain}${portSuffix}/api/platform/getAppConfig`;
};

const getCostCenterConfigUrls = () => {
  const domain = getCostCenterDomain();
  const disableHttps = ['true', '1'].includes(
    (process.env.SEALOS_DISABLE_HTTPS || '').toLowerCase()
  );
  const configuredProtocol = disableHttps ? 'http' : 'https';
  const configuredPort = disableHttps
    ? process.env.SEALOS_HTTP_PORT || ''
    : process.env.SEALOS_CLOUD_PORT || '';
  const configuredUrl = getExternalConfigUrl(domain, configuredProtocol, configuredPort);

  const urls = [COSTCENTER_SERVICE_CONFIG_URL, configuredUrl];
  return [...new Set(urls)];
};

async function getCostCenterConfig(): Promise<CostCenterConfigResponse> {
  let lastError: unknown;

  for (const url of getCostCenterConfigUrls()) {
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

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await getCostCenterConfig();
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
