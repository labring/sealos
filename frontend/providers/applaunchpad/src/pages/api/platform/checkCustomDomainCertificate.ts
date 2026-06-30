import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getCustomDomainCertificateCoverage } from '@/services/backend/customDomainCertificate';
import { normalizeCustomDomainMode, normalizeDomainName } from '@/utils/custom-domain';

const domainPattern = /^((?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonRes(res, {
      code: 405,
      error: `Method ${req.method} Not Allowed`
    });
  }

  const customDomainMode = normalizeCustomDomainMode(
    global.AppConfig?.launchpad.customDomain?.mode
  );
  if (customDomainMode !== 'certificate') {
    return jsonRes(res, {
      data: {
        customDomain: normalizeDomainName(req.body?.customDomain),
        status: 'unsupported',
        reason: 'Custom domain certificate mode is disabled'
      }
    });
  }

  const customDomain = normalizeDomainName(req.body?.customDomain);
  if (!customDomain || !domainPattern.test(customDomain)) {
    return jsonRes(res, {
      code: 400,
      error: 'customDomain is invalid'
    });
  }

  const tlsSecretName =
    global.AppConfig?.launchpad.customDomain?.certificate?.tlsSecretName || 'wildcard-cert';
  const coverage = await getCustomDomainCertificateCoverage({
    customDomain,
    tlsSecretName
  });

  return jsonRes(res, {
    data: coverage
  });
}
