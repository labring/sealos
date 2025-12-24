import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Deployment } from '@/k8slens/kube-object';
import { getConditionTextTone } from '@/utils/condtion-color';
import { Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import DeploymentDetail from './deployment-detail';
import { useDeploymentStore } from '@/store/kube';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Deployment> = [
  {
    title: 'Pods',
    key: 'pods',
    render: (_, dep) => {
      const { replicas = 0, availableReplicas = 0 } = dep.status ?? {};
      return `${availableReplicas}/${replicas}`;
    }
  },

  {
    title: 'Conditions',
    key: 'conditions',
    render: (_, dep) =>
      dep.getConditions().map(({ type, message }) => (
        <Tooltip key={type} title={message}>
          <Typography.Text className="mr-2 last:mr-0" type={getConditionTextTone(type)}>
            {type}
          </Typography.Text>
        </Tooltip>
      ))
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (_, dep) => <KubeObjectAge obj={dep} />
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, dep) => <ActionButton obj={dep} />
  }
];

const DeploymentOverviewPage = () => {
  const { items, initialize, isLoaded } = useDeploymentStore();

  return (
    <PanelTable
      columns={columns}
      loading={!isLoaded}
      dataSource={items}
      sectionTitle="Deployments"
      DetailDrawer={DeploymentDetail}
      getRowKey={(deployment) => deployment.getId()}
      initializers={[initialize]}
      getDetailItem={(deployment) => deployment}
    />
  );
};

export default DeploymentOverviewPage;
