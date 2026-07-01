import type { AppEditType } from '@/types/app';
import type { CustomDomainMode } from '@/types';

export const normalizeDomainName = (domain = '') =>
  domain.trim().toLowerCase().replace(/\.+$/g, '');

export const normalizeCustomDomainMode = (mode?: string): CustomDomainMode =>
  mode === 'certificate' ? 'certificate' : 'cname';

export const normalizeCustomDomainCertificateDomains = (domains: string[] = []) =>
  Array.from(new Set(domains.map((domain) => normalizeDomainName(domain)).filter(Boolean)));

export const isDomainCoveredByCertificateDomain = (domain: string, certificateDomain: string) => {
  const normalizedDomain = normalizeDomainName(domain);
  const normalizedCertificateDomain = normalizeDomainName(certificateDomain);

  if (!normalizedDomain || !normalizedCertificateDomain) return false;
  if (normalizedCertificateDomain === normalizedDomain) return true;

  if (!normalizedCertificateDomain.startsWith('*.')) return false;

  const suffix = normalizedCertificateDomain.slice(2);
  if (!suffix || !normalizedDomain.endsWith(`.${suffix}`)) return false;

  const prefix = normalizedDomain.slice(0, -suffix.length - 1);
  return Boolean(prefix) && !prefix.includes('.');
};

export const findMatchingCertificateDomain = (domain: string, certificateDomains: string[] = []) =>
  normalizeCustomDomainCertificateDomains(certificateDomains).find((certificateDomain) =>
    isDomainCoveredByCertificateDomain(domain, certificateDomain)
  );

export const isDomainCoveredByCertificateDomains = (
  domain: string,
  certificateDomains: string[] = []
) => Boolean(findMatchingCertificateDomain(domain, certificateDomains));

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
