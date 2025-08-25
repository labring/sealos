import { listResources } from '@/api/kubernetes';
import { KubeJsonApiDataFor, KubeObject, KubeObjectConstructor } from '@/k8slens/kube-object';
import { isDefined } from '@/k8slens/utilities';
import { buildErrorResponse } from '@/services/backend/response';
import { APICallback } from '@/types/state';
import { KubeList, KubeStatus, WatchEvent } from '@/types/kube-resource';
import { KubeStore } from '@/types/state';
import { entries } from 'lodash';
import { StateCreator } from 'zustand';
import EventSource from 'eventsource';
import { getUserKubeConfig } from '@/utils/user';
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
    async initialize(callback: APICallback) {
      const { kind, objConstructor, isLoaded } = get();

      if (isLoaded) return;
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
        console.log('Failed to initialize', err);
        callback(undefined, buildErrorResponse(err));
      }
    },
    watch(callback: APICallback) {
      const { isLoaded, es, kind, resourceVersion, modify, remove, objConstructor } = get();
      if (!isLoaded) {
        callback(
          undefined,
          buildErrorResponse(
            new Errno(0, -1, 'Not Initialized', `${kind} store has not been initialized!`)
          )
        );
        return () => {};
      }

      if (es && es.readyState !== EventSource.CLOSED) return () => es.close();
      const nxtES = new EventSource(
        `${window.location.origin}/api/kubernetes/watch?kind=${kind}&resourceVersion=${resourceVersion}`,
        {
          headers: {
            Authorization: encodeURIComponent(getUserKubeConfig())
          }
        }
      );
      console.log('watching');

      nxtES.onerror = (evt) => {
        console.log('ES onerror', evt.data);
        callback(undefined, evt.data);
      };

      nxtES.addEventListener('watch', async (evt) => {
        const data = JSON.parse(evt.data) as WatchEvent<Data | KubeStatus>;
        if (data.type === 'ERROR') {
          const kubeStatus = data.object as KubeStatus;
          // resource version is too old, we need a new one
          // callback hook must recall this function
          if (kubeStatus.code === 410) {
            nxtES.close();
            console.log('finished watching, then start reinitialize');
            try {
              const res = await listResources<K, Data>(kind);
              const parsed = parseResponse<K, Data>(res.data, kind, objConstructor);
              set({
                items: parsed.sort((a, b) => a.getName().localeCompare(b.getName())),
                resourceVersion: res.data.metadata.resourceVersion
              });
            } catch (err: any) {
              console.log('Failed to reinitialize', err);
              err.message =
                'Failed to reinitialize, you need to refresh this page, sorry.\n' + err.message;
              callback(undefined, buildErrorResponse(err));
            }
          } else console.log('watch error', kubeStatus);

          callback(
            undefined,
            buildErrorResponse(
              new Errno(
                kubeStatus.code,
                ErrnoCode.APIWatchResponseError,
                kubeStatus.reason,
                kubeStatus.message
              )
            )
          );
          return;
        }

        console.log('watch data', data);
        switch (data.type) {
          case 'ADDED':
          case 'MODIFIED':
            modify(new objConstructor(data.object));
            break;
          case 'DELETED':
            remove(new objConstructor(data.object));
            break;
          case 'BOOKMARK':
            set({ resourceVersion: data.object.metadata.resourceVersion });
            break;
        }
      });

      set({
        es: nxtES
      });

      return () => nxtES.close();
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
