import { listResources } from '@/api/kubernetes';
import { KubeObjectKind } from '@/constants/kube-object';
import { KubeObjectConstructor } from '@/k8slens/kube-object';
import { Devbox } from '@/k8slens/kube-object/src/specifics/devbox';
import { isDefined } from '@/k8slens/utilities';
import { buildErrorResponse } from '@/services/backend/response';
import { KubeList } from '@/types/kube-resource';
import { KubeStore } from '@/types/state';
import { create } from 'zustand';
import { createKubeStoreSlice } from './kube.store';

export const useDevboxStore = create<KubeStore<Devbox>>()((...a) => ({
  ...createKubeStoreSlice<Devbox>(Devbox.kind, Devbox)(...a),
  async initialize(callback, force = false) {
    const { kind, objConstructor, isLoaded } = a[1](); // get()
    const set = a[0]; // set()

    if (isLoaded && !force) return;

    try {
      const res = await listResources<Devbox>(kind);
      const parsed = parseResponse(res.data, kind, objConstructor);
      set({
        items: parsed.sort((a, b) => a.getName().localeCompare(b.getName())),
        isLoaded: true,
        resourceVersion: res.data.metadata.resourceVersion
      });
      callback(res.code);
    } catch (err: any) {
      if (err?.code === 404 || err?.status === 404 || err?.response?.status === 404) {
        // Fallback to v1alpha1
        try {
          const res = await listResources<Devbox>(KubeObjectKind.DevboxOld);
          const parsed = parseResponse(res.data, kind, objConstructor);
          set({
            items: parsed.sort((a, b) => a.getName().localeCompare(b.getName())),
            isLoaded: true,
            resourceVersion: res.data.metadata.resourceVersion
          });
          callback(res.code);
          return;
        } catch (fallbackErr) {
          callback(undefined, buildErrorResponse(fallbackErr));
        }
      } else {
        callback(undefined, buildErrorResponse(err));
      }
    }
  }
}));

const parseResponse = (
  data: KubeList<any>,
  kind: string,
  objectConstructor: KubeObjectConstructor<Devbox, any>
): Devbox[] => {
  const KubeObjectConstructor = objectConstructor;
  const { apiVersion, items } = data;
  return items
    .map((item) => {
      if (!item.metadata) return undefined;
      return new KubeObjectConstructor({
        ...item,
        kind,
        apiVersion
      });
    })
    .filter(isDefined);
};
