import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ConfigMap } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';
import ConfigMapDetail from './config-map-detail';
import { useConfigMapStore } from '@/store/kube';
import PanelTable from '../../../panel-table/table';
import ActionButton from '../../../action/action-button';

const columns: ColumnsType<ConfigMap> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, configMap) => configMap.getName()
  },
  {
    title: 'Keys',
    key: 'keys',
    render: (_, configMap) => configMap.getKeys().join(', ')
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, configMap) => <KubeObjectAge obj={configMap} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, configMap) => <ActionButton obj={configMap} />
  }
];

const ConfigMapOverviewPage = () => {
  const { items, initialize, isLoaded, watch } = useConfigMapStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Config Maps"
      DetailDrawer={ConfigMapDetail}
      getRowKey={(configMap) => configMap.getId()}
      initializers={[initialize]}
      watchers={[watch]}
      getDetailItem={(configMap) => configMap}
    />
  );
};

export default ConfigMapOverviewPage;
