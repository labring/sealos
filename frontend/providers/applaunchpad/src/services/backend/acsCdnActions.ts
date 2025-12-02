import { createClient } from './acsApiClient';

const apiClient = createClient({
  auth: {
    accessKeyId: global.AppConfig.launchpad.checkIcpReg.accessKeyID,
    accessKeySecret: global.AppConfig.launchpad.checkIcpReg.accessKeySecret
  },
  host: global.AppConfig.launchpad.checkIcpReg.endpoint,
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
