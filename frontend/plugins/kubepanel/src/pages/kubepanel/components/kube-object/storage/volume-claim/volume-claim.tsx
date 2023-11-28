import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PersistentVolumeClaim, Pod } from '@/k8slens/kube-object';
import { RequestController } from '@/utils/request-controller';
import { useQuery } from '@tanstack/react-query';
import { ColumnsType } from 'antd/es/table';
import { useRef, useState } from 'react';
import PersistentVolumeClaimDetail from './volume-claim-detail';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
import { fetchData, usePodStore, useVolumeClaimStore } from '@/store/kube';

const columns: ColumnsType<{ volumeClaim: PersistentVolumeClaim; pods: Pod[] }> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, { volumeClaim }) => volumeClaim.getName()
  },
  {
    title: 'Storage Class',
    key: 'storageClass',
    render: (_, { volumeClaim }) => volumeClaim.spec.storageClassName
  },
  {
    title: 'Size',
    key: 'size',
    render: (_, { volumeClaim }) => volumeClaim.getStorage()
  },
  {
    title: 'Pods',
    key: 'pods',
    ellipsis: true,
    render: (_, { volumeClaim, pods }) => {
      const podsNames = volumeClaim.getPods(pods).map((pod) => pod.getName());
      return podsNames.map((name) => (
        <span key={name} className="text-blue-300 mr-1">
          {name}
        </span>
      ));
    }
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, { volumeClaim }) => <KubeObjectAge obj={volumeClaim} />
  },
  {
    title: 'Status',
    fixed: 'right',
    key: 'status',
    render: (_, { volumeClaim }) => volumeClaim.getStatus()
  },
  {
    dataIndex: 'name',
    key: 'action',
    fixed: 'right',
    render: (_, { volumeClaim }) => (
      <ActionButton
        obj={volumeClaim}
        onUpdate={(data: string) =>
          updateResource(data, volumeClaim.getName(), Resources.PersistentVolumeClaims)
        }
        onDelete={() => deleteResource(volumeClaim.getName(), Resources.PersistentVolumeClaims)}
      />
    )
  }
];

const PersistentVolumeClaimOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [volumeClaim, setVolumeClaim] = useState<PersistentVolumeClaim>();
  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));
  const { items: volumeClaims, replace: replaceVolumeClaims } = useVolumeClaimStore();
  const { items: pods, replace: replacePods } = usePodStore();

  useQuery(
    ['persistentVolumeClaims', 'pods'],
    () => {
      const tasks = [
        () => fetchData(replaceVolumeClaims, Resources.PersistentVolumeClaims),
        () => fetchData(replacePods, Resources.Pods)
      ];
      return requestController.current.runTasks(tasks);
    },
    {
      refetchInterval: 5000
    }
  );

  const dataSource = volumeClaims.map((volumeClaim) => ({
    volumeClaim,
    pods
  }));

  return (
    <>
      <Table
        title={'Persistent Volume Claims'}
        columns={columns}
        dataSource={dataSource}
        onRow={({ volumeClaim }) => ({
          onClick: () => {
            setVolumeClaim(volumeClaim);
            setOpenDrawer(true);
          }
        })}
      />
      <PersistentVolumeClaimDetail
        volumeClaim={volumeClaim}
        pods={pods}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      />
    </>
  );
};

export default PersistentVolumeClaimOverviewPage;
