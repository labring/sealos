import { PersistentVolumeClaim } from '@/k8slens/kube-object';
import { ItemStore } from './data.store';
import { Resources } from '@/constants/kube-object';

export class PersistentVolumeClaimStore extends ItemStore<PersistentVolumeClaim> {
  constructor() {
    super(Resources.PersistentVolumeClaims);
  }
}
