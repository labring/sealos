import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PersistentVolumeClaim, Pod } from '@/k8slens/kube-object';
import { PERSISTENT_VOLUME_CLAIM_STORE, POD_STORE } from '@/store/static';
import { RequestController } from '@/utils/request-controller';
import { useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { observer } from 'mobx-react';
import { useRef, useState } from 'react';
import PersistentVolumeClaimDetail from './volume-claim-detail';

interface DataType {
  key: string;
  name: string;
  storageClass?: string;
  storage: string;
  podsNames: string[];
  creationTimestamp?: string;
  status: string;
}

const getData = (volumeClaim: PersistentVolumeClaim, pods: Pod[]) => {
  return {
    key: volumeClaim.getName(),
    name: volumeClaim.getName(),
    storageClass: volumeClaim.spec.storageClassName,
    storage: volumeClaim.getStorage(),
    podsNames: volumeClaim.getPods(pods).map((pod) => pod.getName()),
    creationTimestamp: volumeClaim.metadata.creationTimestamp,
    status: volumeClaim.getStatus()
  };
};

const columns: ColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Storage Class',
    dataIndex: 'storageClass',
    key: 'storageClass'
  },
  {
    title: 'Size',
    dataIndex: 'storage',
    key: 'size'
  },
  {
    title: 'Pods',
    dataIndex: 'podsNames',
    key: 'pods',
    render: (podsNames: string[]) =>
      podsNames.map((name) => (
        <span key={name} className="text-blue-300 mr-1">
          {name}
        </span>
      ))
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (creationTimestamp: string) => <KubeObjectAge creationTimestamp={creationTimestamp} />
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status'
  }
];

const PersistentVolumeClaimOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [volumeClaim, setVolumeClaim] = useState<PersistentVolumeClaim>();
  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));

  useQuery(
    ['persistentVolumeClaims', 'pods'],
    () => {
      const tasks = [PERSISTENT_VOLUME_CLAIM_STORE.fetchData, POD_STORE.fetchData];
      return requestController.current.runTasks(tasks);
    },
    {
      refetchInterval: 5000
    }
  );

  const dataSource = PERSISTENT_VOLUME_CLAIM_STORE.items.map((volumeClaim) =>
    getData(volumeClaim, POD_STORE.items)
  );
  return (
    <>
      <Table
        title={() => <span className="p-4 mb-4 text-xl font-light">Persistent Volume Claims</span>}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => {
            const { key } = record;
            const volumeClaim = PERSISTENT_VOLUME_CLAIM_STORE.items.filter(
              (volumeClaim) => volumeClaim.getName() === key
            )[0];
            setVolumeClaim(volumeClaim);
            setOpenDrawer(true);
          }
        })}
      />
      <PersistentVolumeClaimDetail
        volumeClaim={volumeClaim}
        pods={POD_STORE.items}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      />
    </>
  );
};

export default observer(PersistentVolumeClaimOverviewPage);
