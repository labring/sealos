import { createClient } from './acsApiClient';
import { Config } from '@/config';

const apiClient = createClient({
  auth: {
    accessKeyId: Config().launchpad.checkIcpReg.accessKeyID,
    accessKeySecret: Config().launchpad.checkIcpReg.accessKeySecret
  },
  host: Config().launchpad.checkIcpReg.endpoint,
  version: '2018-05-10'
});

export async function checkDomainICP(domain: string) {
  return apiClient
    .fetch({
      action: 'CheckCdnDomainICP',
      method: 'POST',
      body: {
        DomainName: domain
      }
    })
    .then((resp) => resp.json())
    .then((data: { Status: 'DomainIsRegistration' | 'DomainNotRegistration' }) => ({
      success: true as const,
      data: {
        domain: domain,
        icpRegistered: data.Status === 'DomainIsRegistration' ? true : false
      }
    }))
    .catch((e) => ({
      success: false as const,
      cause: e as unknown
    }));
}
