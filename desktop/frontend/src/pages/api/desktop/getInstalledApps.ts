import { NextApiRequest, NextApiResponse } from 'next';
import installedApps from '../../../mock/installedApps';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(installedApps, resp);
}
