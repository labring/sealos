import { createClient } from './acsApiClient';

const ICP_STATUSES = ['DomainIsRegistration', 'DomainNotRegistration'] as const;

const apiClient = createClient({
  auth: {
    accessKeyId: global.AppConfig.launchpad.checkIcpReg.accessKeyID,
    accessKeySecret: global.AppConfig.launchpad.checkIcpReg.accessKeySecret
  },
  host: global.AppConfig.launchpad.checkIcpReg.endpoint,
  version: '2018-05-10'
});

function isExpectedICPStatus(status: unknown): status is (typeof ICP_STATUSES)[number] {
  return ICP_STATUSES.includes(status as (typeof ICP_STATUSES)[number]);
}

async function readResponse(resp: Response): Promise<unknown> {
  const text = await resp.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function checkDomainICP(domain: string) {
  try {
    const resp = await apiClient.fetch({
      action: 'CheckCdnDomainICP',
      method: 'POST',
      body: {
        DomainName: domain
      }
    });
    const data = await readResponse(resp);

    if (!resp.ok) {
      return {
        success: false as const,
        cause: data
      };
    }

    const status =
      typeof data === 'object' && data !== null && 'Status' in data ? data.Status : undefined;
    if (!isExpectedICPStatus(status)) {
      return {
        success: false as const,
        cause: data
      };
    }

    return {
      success: true as const,
      data: {
        domain: domain,
        icpRegistered: status === 'DomainIsRegistration'
      }
    };
  } catch (e) {
    return {
      success: false as const,
      cause: e as unknown
    };
  }
}
