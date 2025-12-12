import { ActionButton } from '@/components/common/action/action-button';
import { PanelTable } from '@/components/common/panel-table/table';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ResponsiveKeyList } from '@/components/kube/object/responsive-key-list';
import { ConfigMap } from '@/k8slens/kube-object';
import { useConfigMapStore } from '@/store/kube';
import { ColumnsType } from 'antd/es/table';
import { useEffect, useRef, useState } from 'react';
import ConfigMapDetail from './config-map-detail';

const columns: ColumnsType<ConfigMap> = [
  {
    title: 'Keys',
    key: 'keys',
    render: (_, configMap) => <ResponsiveKeyList keys={configMap.getKeys()} />
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
  const { items, initialize, isLoaded } = useConfigMapStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Config Maps"
      DetailDrawer={ConfigMapDetail}
      getRowKey={(configMap) => configMap.getId()}
      initializers={[initialize]}
      getDetailItem={(configMap) => configMap}
    />
  );
};

export default ConfigMapOverviewPage;
