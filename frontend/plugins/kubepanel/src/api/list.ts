import { KubeObjectConstructorMap, Resources } from '@/constants/kube-object';
import {
  KubeJsonApiDataFor,
  KubeObject,
  KubeObjectConstructor,
  isJsonApiDataList,
  isPartialJsonApiData
} from '@/k8slens/kube-object';
import { isDefined } from '@/k8slens/utilities';
import { GET } from '@/services/request';
import { isArray } from 'lodash';

export const getResource = async <Object extends KubeObject = KubeObject>(
  resource: Resources
): Promise<Object[]> => {
  try {
    const res = await GET<unknown>(`/api/list?resource=${resource}`);

    const parsed = parseResponse<Object>(res, KubeObjectConstructorMap[resource]);

    if (isArray(parsed)) {
      return parsed;
    }

    if (!parsed) return [];

    return Promise.reject(
      new Error(
        `GET multiple request to ${resource} returned not an array: ${JSON.stringify(parsed)}`
      )
    );
  } catch (err) {
    return Promise.reject(err);
  }
};

const parseResponse = <
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(
  data: unknown,
  objectConstructor: KubeObjectConstructor<Object, Data>
): Object[] | null => {
  if (!data) {
    return null;
  }

  const KubeObjectConstructor = objectConstructor;

  if (isJsonApiDataList(data, isPartialJsonApiData)) {
    const { apiVersion, items } = data;

    return items
      .map((item) => {
        if (!item.metadata) {
          return undefined;
        }

        const object = new KubeObjectConstructor({
          ...(item as Data),
          kind: objectConstructor.kind,
          apiVersion
        });
        return object;
      })
      .filter(isDefined);
  }

  return null;
};
