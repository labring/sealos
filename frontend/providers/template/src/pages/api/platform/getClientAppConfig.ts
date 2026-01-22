import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    ui: {
      brandName: fullConfig.template.ui.brandName,
      carousel: fullConfig.template.ui.carousel
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
