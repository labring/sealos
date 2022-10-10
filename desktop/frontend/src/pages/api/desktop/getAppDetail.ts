import { NextApiRequest, NextApiResponse } from 'next';
import appDetailInfo from '../../../mock/appDetailInfo';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  JsonResp(appDetailInfo, resp);
}
