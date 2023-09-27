import { entries, isArray } from "lodash";
import { action, makeObservable, observable } from "mobx";
import { Resource } from "@/k8s/types/types";
import { KubeObject } from "@/k8slens/kube-object";
import { getResource } from "@/service/fetch-kube-object";

export class ItemStore<K extends KubeObject = KubeObject> {
  @observable items = observable.array<K>([], { deep: false });
  private readonly resource: Resource;

  constructor(resource: Resource) {
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

        return entries(labels).every(
          ([key, value]) => itemLabels[key] === value
        );
      });
    }
  }

  // function() can't be used as a variable, it'll cause an 'This is undefined' error
  // we want to consider it as a variable and pass it into RequestController.runTasks
  fetchData = async () => {
    try {
      const items = await getResource<K>(this.resource);
      this.replaceItems(items);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
