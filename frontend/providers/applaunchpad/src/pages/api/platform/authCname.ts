import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import dns from 'dns';
import type { AuthCnamePrams } from '@/api/params';
import { normalizeDomainName } from '@/utils/custom-domain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { publicDomain, customDomain } = req.body as AuthCnamePrams;
    const expectedPublicDomain = normalizeDomainName(publicDomain);
    const hostname = normalizeDomainName(customDomain);

    if (!hostname || !expectedPublicDomain) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: publicDomain or customDomain'
      });
    }

    await (async () =>
      new Promise((resolve, reject) => {
        dns.resolveCname(hostname, (err, address) => {
          console.log('DNS resolve result:', err, address);
          if (err) {
            if (err.code === 'ENODATA') {
              return reject({
                code: 'DNS_NO_CNAME_RECORD',
                message: `No CNAME record found for domain: ${hostname}`,
                hostname
              });
            } else if (err.code === 'ENOTFOUND') {
              return reject({
                code: 'DNS_DOMAIN_NOT_FOUND',
                message: `Domain not found: ${hostname}`,
                hostname
              });
            } else if (err.code === 'ETIMEDOUT') {
              return reject({
                code: 'DNS_TIMEOUT',
                message: `DNS query timeout for domain: ${hostname}`,
                hostname
              });
            } else {
              return reject({
                code: 'DNS_QUERY_ERROR',
                message: `DNS query failed for domain: ${hostname}`,
                hostname,
                originalError: err
              });
            }
          }

          if (!address || address.length === 0) {
            return reject({
              code: 'DNS_NO_CNAME_RECORD',
              message: `No CNAME record found for domain: ${hostname}`,
              hostname
            });
          }

          const normalizedRecords = address.map((item) => normalizeDomainName(item));
          if (!normalizedRecords.includes(expectedPublicDomain)) {
            return reject({
              code: 'CNAME_MISMATCH',
              message: `CNAME mismatch: The CNAME for ${hostname} does not point to the expected value ${expectedPublicDomain}`,
              expected: expectedPublicDomain,
              actual: normalizedRecords[0],
              hostname
            });
          }

          resolve('');
        });
      }))();

    jsonRes(res);
  } catch (error: any) {
    console.log('CNAME mismatch error:', error);
    jsonRes(res, {
      code: 400,
      error,
      message: error?.message || 'CNAME mismatch error'
    });
  }
}
