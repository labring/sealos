import { jsonRes } from '@/services/backend/response';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (process.env.GUIDE_ENABLED !== 'true') return jsonRes({ data: null });

    const data = (await req.json()) as {
      desktopToAppToken: string;
    };
    if (!data.desktopToAppToken) {
      return jsonRes({ code: 401, message: 'token is valid' });
    }

    const domain = process.env.SEALOS_DOMAIN;

    const response = await fetch(`https://${domain}/api/account/checkTask`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: data.desktopToAppToken
      }
    });

    const result: {
      code: number;
      data: any;
      message: string;
    } = await response.json();

    if (result.code !== 200) {
      return jsonRes({ code: result.code, message: 'desktop api is err' });
    } else {
      return jsonRes({ data: result.data });
    }
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
