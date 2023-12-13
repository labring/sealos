import { KubeObject } from '@/k8slens/kube-object';

type DetailDrawerProps<K extends KubeObject> = {
  obj?: K;
  onClose: () => void;
  open: boolean;
};
