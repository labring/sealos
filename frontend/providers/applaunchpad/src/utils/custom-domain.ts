import type { AppEditType } from '@/types/app';

export const normalizeDomainName = (domain = '') =>
  domain.trim().toLowerCase().replace(/\.+$/g, '');

export const getPublicDomainHost = (
  network: Pick<AppEditType['networks'][number], 'publicDomain' | 'domain'>
) => {
  const publicDomain = normalizeDomainName(network.publicDomain);
  const domain = normalizeDomainName(network.domain);

  return publicDomain && domain ? `${publicDomain}.${domain}` : '';
};

export const getCustomDomainBindings = (networks: AppEditType['networks']) =>
  networks
    .map((network, index) => {
      if (!network.openPublicDomain) {
        return null;
      }

      const customDomain = normalizeDomainName(network.customDomain);
      if (!customDomain) {
        return null;
      }

      return {
        networkIndex: index,
        customDomain,
        publicDomain: getPublicDomainHost(network)
      };
    })
    .filter(
      (
        item
      ): item is {
        networkIndex: number;
        customDomain: string;
        publicDomain: string;
      } => !!item
    );
