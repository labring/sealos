import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ConfigMap } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ConfigMapDetail from './config-map-detail';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
import { fetchData, useConfigMapStore } from '@/store/kube';

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
    key: 'action',
    fixed: 'right',
    render: (_, configMap) => (
      <ActionButton
        obj={configMap}
        onUpdate={(data: string) => updateResource(data, configMap.getName(), Resources.ConfigMaps)}
        onDelete={() => deleteResource(configMap.getName(), Resources.ConfigMaps)}
      />
    )
  }
];

const ConfigMapOverviewPage = () => {
  const { items, replace } = useConfigMapStore();
  const [configMap, setConfigMap] = useState<ConfigMap>();
  const [openDrawer, setOpenDrawer] = useState(false);

  useQuery(['configMaps'], () => fetchData(replace, Resources.ConfigMaps), {
    refetchInterval: 5000
  });

  return (
    <>
      <Table
        title={'Config Maps'}
        columns={columns}
        dataSource={items}
        onRow={(configMap) => ({
          onClick: () => {
            setConfigMap(configMap);
            setOpenDrawer(true);
          }
        })}
      />
      <ConfigMapDetail
        configMap={configMap}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
      />
    </>
  );
};

export default ConfigMapOverviewPage;
