import dns from 'dns';
import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { publicDomain, customDomain } = (await req.json()) as {
      publicDomain: string;
      customDomain: string;
    };
    const cnameError = await new Promise<NodeJS.ErrnoException | string | null>((resolve) => {
      dns.resolveCname(customDomain, (err, address) => {
        if (err) return resolve(err);

        if (address[0] !== publicDomain)
          return resolve("Cname auth error: customDomain's cname is not equal to publicDomain");
        resolve(null);
      });
    });
    if (!!cnameError) {
      return jsonRes({
        code: 409,
        error: cnameError
      });
    } else {
      return jsonRes({});
    }
  } catch (error) {
    return jsonRes({
      code: 500,
      error
    });
  }
}
