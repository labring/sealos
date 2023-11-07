import { getInitData } from '@/api/platform';
import { ConfigMapStore } from './k8s/configmap.store';
import { DeploymentStore } from './k8s/deployment.store';
import { PodStore } from './k8s/pod.store';
import { PersistentVolumeClaimStore } from './k8s/pvc.store';
import { StatefulSetStore } from './k8s/statefulset.store';

export const POD_STORE = new PodStore();
export const DEPLOYMENT_STORE = new DeploymentStore();
export const STATEFUL_SET_STORE = new StatefulSetStore();
export const CONFIG_MAP_STORE = new ConfigMapStore();
export const PERSISTENT_VOLUME_CLAIM_STORE = new PersistentVolumeClaimStore();

export let SEALOS_DOMAIN: string;

export const loadInitData = async () => {
  try {
    const res = await getInitData();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;

    return {
      SEALOS_DOMAIN
    };
  } catch (err) {
    console.error(err);
  }

  return {
    SEALOS_DOMAIN
  };
};
