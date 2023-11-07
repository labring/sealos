import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { BaseKubeObjectCondition, Deployment, DeploymentStatus } from '@/k8slens/kube-object';
import { DEPLOYMENT_STORE } from '@/store/static';
import { getConditionColor } from '@/utils/condtion-color';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { observer } from 'mobx-react';
import { useState } from 'react';
import DeploymentDetail from './deployment-detail';

interface DataType {
  key: string;
  name: string;
  pods: string;
  replicas: number;
  creationTimestamp?: string;
  conditions: BaseKubeObjectCondition[];
}

const getData = (dep: Deployment): DataType => {
  const { replicas = 0, availableReplicas = 0 } = dep.status ?? {};
  return {
    key: dep.getName(),
    name: dep.getName(),
    pods: `${availableReplicas}/${replicas}`,
    replicas: dep.getReplicas(),
    creationTimestamp: dep.metadata.creationTimestamp,
    conditions: dep.getConditions()
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
  },
  {
    title: 'Conditions',
    dataIndex: 'conditions',
    key: 'conditions',
    render: (conditions: BaseKubeObjectCondition[]) =>
      conditions.map(({ type, message }) => (
        <Tooltip key={type} title={message}>
          <span className={`mr-2 last:mr-0 text-${getConditionColor(type)}`}>{type}</span>
        </Tooltip>
      ))
  }
];

const DeploymentOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [dep, setDep] = useState<Deployment>();

  useQuery(['deployments'], () => DEPLOYMENT_STORE.fetchData(), {
    refetchInterval: 5000
  });

  const dataSource = DEPLOYMENT_STORE.items.map(getData);
  return (
    <>
      <Table
        title={() => <span className="p-4 mb-4 text-xl font-light">Deployments</span>}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => {
            const { key } = record;
            const dep = DEPLOYMENT_STORE.items.filter((dep) => dep.getName() === key)[0];
            setDep(dep);
            setOpenDrawer(true);
          }
        })}
      />
      <DeploymentDetail dep={dep} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default observer(DeploymentOverviewPage);
