import { ConfigMap } from '@/k8slens/kube-object';
import { ItemStore } from './data.store';
import { Resources } from '@/constants/kube-object';

export class ConfigMapStore extends ItemStore<ConfigMap> {
  constructor() {
    super(Resources.ConfigMaps);
  }
}