import { Pod } from '@/k8slens/kube-object';
import { countBy } from 'lodash';
import { ItemStore } from './data.store';
import { Resources } from '@/constants/kube-object';

export type GetPodsByOwnerId = (ownerId: string) => Pod[];
export type GetByLabel = (labels: string[] | Partial<Record<string, string>>) => Pod[];

export class PodStore extends ItemStore<Pod> {
  constructor() {
    super(Resources.Pods);
  }

  getPodsByOwnerId(workloadId: string): Pod[] {
    return this.items.filter((pod) => {
      return pod.getOwnerRefs().find((owner) => owner.uid === workloadId);
    });
  }

  getPodsStatuses() {
    return countBy(this.items.map((pod) => pod.getStatus()).sort());
  }
}
