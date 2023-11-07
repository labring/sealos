import { entries, isArray } from 'lodash';
import { action, makeObservable, observable } from 'mobx';
import { KubeObject } from '@/k8slens/kube-object';
import { Resources } from '@/constants/kube-object';
import { getResource } from '@/api/list';

export class ItemStore<K extends KubeObject = KubeObject> {
  @observable items = observable.array<K>([], { deep: false });
  private readonly resource: Resources;

  constructor(resource: Resources) {
    this.resource = resource;
    makeObservable(this);
  }

  @action
  replaceItems(items: K | Array<K>) {
    if (isArray(items)) {
      this.items.replace(items);
    } else {
      this.items.replace([items]);
    }
  }

  getByLabel(labels: string[] | Partial<Record<string, string>>): K[] {
    if (Array.isArray(labels)) {
      return this.items.filter((item: K) => {
        const itemLabels = item.getLabels();

        return labels.every((label) => itemLabels.includes(label));
      });
    } else {
      return this.items.filter((item: K) => {
        const itemLabels = item.metadata.labels || {};

        return entries(labels).every(([key, value]) => itemLabels[key] === value);
      });
    }
  }

  // function() can't be used as a variable, it'll cause an 'This is undefined' error
  // we want to consider it as a variable and pass it into RequestController.runTasks
  fetchData = async () => {
    try {
      const items = await getResource<K>(this.resource);
      this.replaceItems(items);
      return items;
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
