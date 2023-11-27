import { KubeObject } from '@/k8slens/kube-object';
import { randomUUID } from 'crypto';
import { observable } from 'mobx';

type cmp<Object extends KubeObject = KubeObject> = (a: Object, b: Object) => number;

export abstract class KubeStore<Object extends KubeObject = KubeObject> {
  readonly storeName: string; // use for debug only
  @observable private items;

  constructor(storeName?: string) {
    this.storeName = storeName ?? `KubeStore-${randomUUID()}`;
    this.items = observable.array<Object>([], { name: this.storeName, deep: false });
  }

  public getItems(sortBy?: cmp<Object>): Object[] {
    if (sortBy) {
      return [...this.items].sort(sortBy);
    }
    return this.items;
  }

  public getItemByIndex(index: number): Object {
    return this.items[index];
  }
}
