import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Deployment } from '@/k8slens/kube-object';
import { getConditionColor } from '@/utils/condtion-color';
import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import DeploymentDetail from './deployment-detail';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
import { fetchData, useDeploymentStore } from '@/store/kube';

const columns: ColumnsType<Deployment> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, dep) => dep.getName()
  },
  {
    title: 'Pods',
    key: 'pods',
    render: (_, dep) => {
      const { replicas = 0, availableReplicas = 0 } = dep.status ?? {};
      return `${availableReplicas}/${replicas}`;
    }
  },
  {
    title: 'Replicas',
    key: 'replicas',
    render: (_, dep) => dep.getReplicas()
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (_, dep) => <KubeObjectAge obj={dep} />
  },
  {
    title: 'Conditions',
    key: 'conditions',
    render: (_, dep) =>
      dep.getConditions().map(({ type, message }) => (
        <Tooltip key={type} title={message}>
          <span className={`mr-2 last:mr-0 text-${getConditionColor(type)}`}>{type}</span>
        </Tooltip>
      ))
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, dep) => (
      <ActionButton
        obj={dep}
        onUpdate={(data: string) => updateResource(data, dep.getName(), Resources.Deployments)}
        onDelete={() => deleteResource(dep.getName(), Resources.Deployments)}
      />
    )
  }
];

const DeploymentOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [dep, setDep] = useState<Deployment>();
  const { items, replace } = useDeploymentStore();

  useQuery(['deployments'], () => fetchData(replace, Resources.Deployments), {
    refetchInterval: 5000
  });

  return (
    <>
      <Table
        title={'Deployments'}
        columns={columns}
        dataSource={items}
        onRow={(dep) => ({
          onClick: () => {
            setDep(dep);
            setOpenDrawer(true);
          }
        })}
      />
      <DeploymentDetail dep={dep} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default DeploymentOverviewPage;
