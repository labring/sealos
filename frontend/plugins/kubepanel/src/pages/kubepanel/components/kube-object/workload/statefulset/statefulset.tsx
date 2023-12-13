import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { StatefulSet } from '@/k8slens/kube-object';
import { useQuery } from '@tanstack/react-query';
import { ColumnsType } from 'antd/es/table';
import { useRef, useState } from 'react';
import StatefulSetDetail from './statefulset-detail';
import { RequestController } from '@/utils/request-controller';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
import { fetchData, getPodsByOwnerId, usePodStore, useStatefulSetStore } from '@/store/kube';

const columns: ColumnsType<StatefulSet> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, stat) => stat.getName()
  },
  {
    title: 'Pods',
    key: 'pods',
    render: (_, stat) => {
      const { readyReplicas = 0, replicas = 0 } = stat.status ?? {};
      return `${readyReplicas}/${replicas}`;
    }
  },
  {
    title: 'Replicas',
    key: 'replicas',
    render: (_, stat) => stat.getReplicas()
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, stat) => <KubeObjectAge obj={stat} />
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, stat) => (
      <ActionButton
        obj={stat}
        onUpdate={(data: string) => updateResource(data, stat.getName(), Resources.StatefulSets)}
        onDelete={() => deleteResource(stat.getName(), Resources.StatefulSets)}
      />
    )
  }
];

const StatefulSetOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [stat, setStat] = useState<StatefulSet>();
  const { items: pods, replace: replacePods } = usePodStore();
  const { items: stats, replace: replaceStats } = useStatefulSetStore();
  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));

  useQuery(
    ['statefulSets', 'pods'],
    () => {
      const task = [
        () => fetchData(replaceStats, Resources.StatefulSets),
        () => fetchData(replacePods, Resources.Pods)
      ];
      return requestController.current.runTasks(task);
    },
    {
      refetchInterval: 5000
    }
  );

  return (
    <>
      <Table
        title={'Stateful Sets'}
        columns={columns}
        dataSource={stats}
        onRow={(stat) => ({
          onClick: () => {
            setStat(stat);
            setOpenDrawer(true);
          }
        })}
      />
      <StatefulSetDetail
        statefulSet={stat}
        childPods={getPodsByOwnerId(pods, stat?.getId() || '')}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      />
    </>
  );
};

export default StatefulSetOverviewPage;
