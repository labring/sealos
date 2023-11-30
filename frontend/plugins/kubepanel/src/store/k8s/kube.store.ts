import { getResource } from '@/api/list';
import { Resources } from '@/constants/kube-object';
import { KubeObject } from '@/k8slens/kube-object';
import { KubeStore } from '@/types/state';
import { entries } from 'lodash';
import { StateCreator } from 'zustand';

export function createKubeStoreSlice<K extends KubeObject>(
  kind: K['kind']
): StateCreator<KubeStore<K>> {
  return (set) => ({
    items: [],
    kind,
    isLoaded: false,
    setIsLoaded(isLoaded) {
      set({ isLoaded });
    },
    modify(item: K) {
      set((state) => {
        const arr = state.items;
        const idx = arr.findIndex((i) => i.getName() === item.getName());
        if (idx === -1) {
          arr.push(item);
        } else {
          arr[idx] = item;
        }
        return { items: arr };
      });
    },
    remove(item: K) {
      set((state) => {
        const items = state.items.filter((i) => i.getName() !== item.getName());
        return { items };
      });
    },
    replace(items) {
      set({ items });
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

// it's used to transition and will be removed very soon
export async function fetchData<K extends KubeObject>(
  setter: KubeStore<K>['replace'],
  resource: Resources
) {
  const items = await getResource<K>(resource);
  setter(items);
  return items;
}
