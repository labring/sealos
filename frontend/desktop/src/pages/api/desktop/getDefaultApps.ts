import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import {
  CRDMeta,
  ForcedIconStyleAnnotation,
  TAppCR,
  TAppCRList,
  TAppConfig,
  TForcedIconStyle
} from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

const normalizeForcedIconStyle = (value: string | undefined): TForcedIconStyle | undefined => {
  if (value === 'contain' || value === 'fill') {
    return value;
  }

  return undefined;
};

const getRepresentativeMeta = (key: string, annotations?: TAppCR['metadata']['annotations']) => {
  const forcedIconStyleFromAnnotation = normalizeForcedIconStyle(
    annotations?.[ForcedIconStyleAnnotation]
  );

  return {
    forcedIconStyle: forcedIconStyleFromAnnotation || (key.startsWith('user-') ? 'contain' : 'fill')
  };
};

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const kc = K8sApiDefault();

    const getMeta = (namespace = 'app-system'): CRDMeta => ({
      group: 'app.sealos.io',
      version: 'v1',
      namespace,
      plural: 'apps'
    });

    const getRawAppList = async (meta: CRDMeta) =>
      ((await ListCRD(kc, meta)).body as TAppCRList).items || [];

    const defaultArr = (await getRawAppList(getMeta()))
      .map<TAppConfig>((item) => {
        const key = `system-${item.metadata.name}` as const;

        return {
          key,
          ...item.spec,
          representativeMeta: getRepresentativeMeta(key, item.metadata.annotations),
          creationTimestamp: item.metadata.creationTimestamp
        };
      })
      .sort((a, b) => {
        if (a.displayType === 'more' && b.displayType !== 'more') {
          return 1;
        } else if (a.displayType !== 'more' && b.displayType === 'more') {
          return -1;
        } else {
          const timeA = a.creationTimestamp ? new Date(a.creationTimestamp).getTime() : 0;
          const timeB = b.creationTimestamp ? new Date(b.creationTimestamp).getTime() : 0;
          return timeB - timeA;
        }
      });

    jsonRes(res, { data: defaultArr });
  } catch (err) {
    console.log(err);
    jsonRes(res, { code: 500, data: err });
  }
}
