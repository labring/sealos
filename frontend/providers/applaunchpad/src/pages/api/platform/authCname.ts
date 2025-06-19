import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import dns from 'dns';
import type { AuthCnamePrams } from '@/api/params';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { publicDomain, customDomain } = req.body as AuthCnamePrams;

    if (!customDomain || !publicDomain) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: publicDomain or customDomain'
      });
    }

    await (async () =>
      new Promise((resolve, reject) => {
        dns.resolveCname(customDomain, (err, address) => {
          console.log('DNS resolve result:', err, address);
          if (err) {
            if (err.code === 'ENODATA') {
              return reject({
                code: 'DNS_NO_CNAME_RECORD',
                message: `No CNAME record found for domain: ${customDomain}`,
                hostname: customDomain
              });
            } else if (err.code === 'ENOTFOUND') {
              return reject({
                code: 'DNS_DOMAIN_NOT_FOUND',
                message: `Domain not found: ${customDomain}`,
                hostname: customDomain
              });
            } else if (err.code === 'ETIMEDOUT') {
              return reject({
                code: 'DNS_TIMEOUT',
                message: `DNS query timeout for domain: ${customDomain}`,
                hostname: customDomain
              });
            } else {
              return reject({
                code: 'DNS_QUERY_ERROR',
                message: `DNS query failed for domain: ${customDomain}`,
                hostname: customDomain,
                originalError: err
              });
            }
          }

          if (!address || address.length === 0) {
            return reject({
              code: 'DNS_NO_CNAME_RECORD',
              message: `No CNAME record found for domain: ${customDomain}`,
              hostname: customDomain
            });
          }

          if (address[0] !== publicDomain) {
            return reject({
              code: 'CNAME_MISMATCH',
              message: "Cname auth error: customDomain's cname is not equal to publicDomain",
              expected: publicDomain,
              actual: address[0],
              hostname: customDomain
            });
          }

          resolve('');
        });
      }))();

    jsonRes(res);
  } catch (error: any) {
    console.error('CNAME auth error:', error);
    jsonRes(res, {
      code: 500,
      error,
      message: error?.message || 'CNAME auth error'
    });
  }
}
