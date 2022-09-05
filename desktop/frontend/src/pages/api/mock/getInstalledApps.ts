import { NextApiRequest, NextApiResponse } from 'next';
import { JsonResp } from '../response';
import installedApps from './installedApps';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(installedApps, resp);
}
