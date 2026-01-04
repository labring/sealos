import { deleteResource } from '@/api/kubernetes';
import { KubeObjectKind } from '@/constants/kube-object';
import { KubeObject } from '@/k8slens/kube-object';
import { buildErrorResponse } from '@/services/backend/response';
import {
  useBucketStore,
  useClusterStore,
  useConfigMapStore,
  useDeploymentStore,
  useDevboxStore,
  useIngressStore,
  usePodStore,
  useSecretStore,
  useServiceStore,
  useStatefulSetStore,
  useVolumeClaimStore
} from '@/store/kube';
import { WarningOutlined } from '@ant-design/icons';
import { Popconfirm, message } from 'antd';
import { useEffect, useState } from 'react';

interface Props<K extends KubeObject> {
  obj: K;
  children: React.ReactNode;
}

export function DeletePopconfirm<K extends KubeObject = KubeObject>({ obj, children }: Props<K>) {
  if (!obj) return null;
  const [confirmLoading, setConfirmLoading] = useState(false);
  const msgKey = `deletedMsg-${obj.getId()}`;

  const bucketStore = useBucketStore();
  const clusterStore = useClusterStore();
  const configMapStore = useConfigMapStore();
  const deploymentStore = useDeploymentStore();
  const devboxStore = useDevboxStore();
  const ingressStore = useIngressStore();
  const podStore = usePodStore();
  const secretStore = useSecretStore();
  const serviceStore = useServiceStore();
  const statefulSetStore = useStatefulSetStore();
  const volumeClaimStore = useVolumeClaimStore();

  const getStore = () => {
    switch (obj.kind) {
      case KubeObjectKind.Bucket:
        return bucketStore;
      case KubeObjectKind.Cluster:
        return clusterStore;
      case KubeObjectKind.ConfigMap:
        return configMapStore;
      case KubeObjectKind.Deployment:
        return deploymentStore;
      case KubeObjectKind.Devbox:
      case KubeObjectKind.DevboxOld:
        return devboxStore;
      case KubeObjectKind.Ingress:
        return ingressStore;
      case KubeObjectKind.Pod:
        return podStore;
      case KubeObjectKind.Secret:
        return secretStore;
      case KubeObjectKind.Service:
        return serviceStore;
      case KubeObjectKind.StatefulSet:
        return statefulSetStore;
      case KubeObjectKind.PersistentVolumeClaim:
        return volumeClaimStore;
      default:
        return null;
    }
  };

  return (
    <>
      <Popconfirm
        title={'Delete Resource'}
        description={
          <>
            Are you sure to delete{' '}
            <span className="text-[#0884DD]">
              {obj.kind}: {obj.getName()}
            </span>
            ?
          </>
        }
        icon={<WarningOutlined className="text-red-500" />}
        onConfirm={() => {
          setConfirmLoading(true);
          deleteResource(obj.kind, obj.getName())
            .then((res) => {
              const store = getStore();
              if (store) {
                store.remove(obj);
              }
              console.log('res', res);
              message.success({
                content: `Successfully deleted ${res.data.kind} ${res.data.metadata.name}`,
                key: msgKey,
                duration: 3
              });
            })
            .catch((err) => {
              const errResp = buildErrorResponse(err);
              message.error({
                content: `Failed to delete ${obj.kind} ${obj.getName()}: ${errResp.error.message}`,
                key: msgKey
              });
            })
            .finally(() => {
              setConfirmLoading(false);
            });
        }}
        okText="Yes"
        okButtonProps={{ loading: confirmLoading }}
        cancelText="No"
      >
        {children}
      </Popconfirm>
    </>
  );
}
