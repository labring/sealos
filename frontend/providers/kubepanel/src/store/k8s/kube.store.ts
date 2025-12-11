import { listResources } from '@/api/kubernetes';
import { KubeJsonApiDataFor, KubeObject, KubeObjectConstructor } from '@/k8slens/kube-object';
import { isDefined } from '@/k8slens/utilities';
import { buildErrorResponse } from '@/services/backend/response';
import { APICallback } from '@/types/state';
import { KubeList, KubeStatus, WatchEvent } from '@/types/kube-resource';
import { KubeStore } from '@/types/state';
import { entries } from 'lodash';
import { StateCreator } from 'zustand';
import { Errno, ErrnoCode } from '@/services/backend/error';

export function createKubeStoreSlice<
  K extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<K> = KubeJsonApiDataFor<K>
>(kind: K['kind'], objConstructor: KubeObjectConstructor<K, Data>): StateCreator<KubeStore<K>> {
  return (set, get) => ({
    items: [],
    kind,
    isLoaded: false,
    resourceVersion: '',
    objConstructor,
    modify(item: K) {
      set((state) => {
        const arr = [...state.items];
        const idx = arr.findIndex((i) => i.getName() === item.getName());
        if (idx === -1) {
          arr.push(item);
        } else {
          arr[idx] = item;
        }
        return { items: arr.sort((a, b) => a.getName().localeCompare(b.getName())) };
      });
    },
    remove(item: K) {
      set((state) => {
        const items = state.items.filter((i) => i.getName() !== item.getName());
        return { items };
      });
    },
    async initialize(callback: APICallback, force = false) {
      const { kind, objConstructor, isLoaded } = get();

      if (isLoaded && !force) return;
      try {
        const res = await listResources<K, Data>(kind);
        const parsed = parseResponse<K, Data>(res.data, kind, objConstructor);
        set({
          items: parsed.sort((a, b) => a.getName().localeCompare(b.getName())),
          isLoaded: true,
          resourceVersion: res.data.metadata.resourceVersion
        });
        callback(res.code);
      } catch (err) {
        callback(undefined, buildErrorResponse(err));
      }
    }
  });
}

export function getByLabel<K extends KubeObject>(
  items: K[],
  labels: string[] | Partial<Record<string, string>>
): K[] {
  if (Array.isArray(labels)) {
    return items.filter((item: K) => {
      const itemLabels = item.getLabels();

      return labels.every((label) => itemLabels.includes(label));
    });
  } else {
    return items.filter((item: K) => {
      const itemLabels = item.metadata.labels || {};

      return entries(labels).every(([key, value]) => itemLabels[key] === value);
    });
  }
}

const parseResponse = <
  K extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<K> = KubeJsonApiDataFor<K>
>(
  data: KubeList<Data>,
  kind: string,
  objectConstructor: KubeObjectConstructor<K, Data>
): K[] => {
  const KubeObjectConstructor = objectConstructor;

  const { apiVersion, items } = data;

  return items
    .map((item) => {
      if (!item.metadata) {
        return undefined;
      }

      const object = new KubeObjectConstructor({
        ...item,
        kind,
        apiVersion
      });
      return object;
    })
    .filter(isDefined);
};
