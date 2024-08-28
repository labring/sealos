import { authSession } from '@/service/backend/auth';
import { getRegionList } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const { endTime, startTime } = req.body as {
      endTime?: Date;
      startTime?: Date;
    };
    if (!endTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    if (!startTime)
      return jsonRes(resp, {
        code: 400,
        message: 'endTime is invalid'
      });
    const regions = await getRegionList();
    if (!regions) throw Error('get all regions error');
    const urls = regions.map(
      (region: { accountSvc: string }) => 'http://' + region.accountSvc + '/account/v1alpha1/costs'
    ) as string[];
    const body = JSON.stringify({
      endTime,
      kubeConfig: kc.exportConfig(),
      startTime
    });
    const reslistRaw = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          method: 'POST',
          body
        })
      )
    );
    // if (reslistRaw.some((res) => !res.ok)) throw Error('get costs list error');
    const resultList = await Promise.all(reslistRaw.map((res) => res.json()));

    const someArr = resultList
      .map<{ data: [number, string][]; region: { name: { zh: string; en: string } } }>(
        (result, i) => ({
          data: result?.data?.costs || [],
          region: regions[i]
        })
      )
      .map<
        [
          [number, string][],
          {
            zh: string;
            en: string;
          }
        ]
      >((d) => [d.data.toSorted(([aDate], [bDate]) => aDate - bDate), d.region.name]);

    let pointers: number[] = new Array(someArr.length).fill(0);
    const maxPointers = someArr.map((d) => d[0].length);
    let mergedData: [number, string][] = [];
    // merge multi-region datas
    while (pointers.some((v, i) => maxPointers[i] > v)) {
      let minPair: (typeof mergedData)[number] = [new Date().getTime() / 1000, '0'];
      let minRegionIndex = -1;
      // find out minRegionIndex & minPair by older date
      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i] >= maxPointers[i]) {
          continue;
        }
        const currentRegionData = someArr[i][0];
        const currentRegionPointer = pointers[i];
        const currentRegionPair = currentRegionData[currentRegionPointer];
        if (currentRegionPair[0] > minPair[0]) continue;
        minPair = currentRegionPair;
        minRegionIndex = i;
      }
      if (minRegionIndex === -1) break;
      if (mergedData.length === 0) mergedData.push([...minPair]);
      else {
        const latestMegedPair = mergedData[mergedData.length - 1];
        if (latestMegedPair[0] === minPair[0]) {
          const mergedAmount = BigInt(latestMegedPair[1]);
          const minPairAmount = BigInt(minPair[1]);
          latestMegedPair[1] = (mergedAmount + minPairAmount).toString();
        } else {
          mergedData.push([...minPair]);
        }
      }
      pointers[minRegionIndex]++;
    }
    someArr.unshift([mergedData, { zh: '汇总', en: 'Total' }]);
    return jsonRes(resp, {
      code: 200,
      data: someArr
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing cost error' });
  }
}
