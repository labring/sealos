import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { StatefulSet } from '@/k8slens/kube-object';
import { POD_STORE, STATEFUL_SET_STORE } from '@/store/static';
import { useQuery } from '@tanstack/react-query';
import { ColumnsType } from 'antd/es/table';
import { observer } from 'mobx-react';
import { useRef, useState } from 'react';
import StatefulSetDetail from './statefulset-detail';
import { RequestController } from '@/utils/request-controller';
import Table from '../../table/table';

interface DataType {
  key: string;
  name: string;
  pods: string;
  replicas: number;
  creationTimestamp?: string;
}

const getData = (statefulSet: StatefulSet): DataType => {
  const { readyReplicas = 0, currentReplicas = 0, replicas = 0 } = statefulSet.status ?? {};
  return {
    key: statefulSet.getName(),
    name: statefulSet.getName(),
    pods: `${readyReplicas}/${replicas}`,
    replicas: statefulSet.getReplicas(),
    creationTimestamp: statefulSet.metadata.creationTimestamp
  };
};

const columns: ColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Pods',
    dataIndex: 'pods',
    key: 'pods'
  },
  {
    title: 'Replicas',
    dataIndex: 'replicas',
    key: 'replicas'
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (creationTimestamp: string) => <KubeObjectAge creationTimestamp={creationTimestamp} />
  }
];

const StatefulSetOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [statefulSet, setStatefulSet] = useState<StatefulSet>();
  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));

  useQuery(
    ['statefulSets', 'pods'],
    () => {
      const task = [STATEFUL_SET_STORE.fetchData, POD_STORE.fetchData];
      return requestController.current.runTasks(task);
    },
    {
      refetchInterval: 5000
    }
  );

  const dataSource = STATEFUL_SET_STORE.items.map(getData);
  return (
    <>
      <Table
        title={'Stateful Sets'}
        columns={columns}
        dataSource={dataSource}
        onRow={(record) => ({
          onClick: () => {
            const { key } = record;
            const statefulSet = STATEFUL_SET_STORE.items.filter(
              (statefulSet) => statefulSet.getName() === key
            )[0];
            setStatefulSet(statefulSet);
            setOpenDrawer(true);
          }
        })}
      />
      <StatefulSetDetail
        statefulSet={statefulSet}
        childPods={POD_STORE.getPodsByOwnerId(statefulSet?.getId() ?? '')}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      />
    </>
  );
};

export default observer(StatefulSetOverviewPage);
