import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ConfigMap } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/es/table';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { CONFIG_MAP_STORE } from '@/store/static';
import { useQuery } from '@tanstack/react-query';
import ConfigMapDetail from './config-map-detail';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
interface DataType {
  key: string;
  name: string;
  keys: string[];
  creationTimestamp?: string;
}

const getData = (configMap: ConfigMap): DataType => {
  return {
    key: configMap.getName(),
    name: configMap.getName(),
    keys: configMap.getKeys(),
    creationTimestamp: configMap.metadata.creationTimestamp
  };
};

const columns: ColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Keys',
    dataIndex: 'keys',
    key: 'keys',
    render: (keys: string[]) => keys.join(', ')
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (creationTimestamp: string) => <KubeObjectAge creationTimestamp={creationTimestamp} />
  },
  {
    dataIndex: 'name',
    key: 'action',
    fixed: 'right',
    render: (name: string) => (
      <ActionButton
        obj={CONFIG_MAP_STORE.items.filter((configMap) => configMap.getName() === name)[0]}
        onUpdate={(data: string) => updateResource(data, name, Resources.ConfigMaps)}
        onDelete={() => deleteResource(name, Resources.ConfigMaps)}
      />
    )
  }
];

const ConfigMapOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [configMap, setConfigMap] = useState<ConfigMap>();

  useQuery(['configMaps'], () => CONFIG_MAP_STORE.fetchData(), {
    refetchInterval: 5000
  });

  const dataSource = CONFIG_MAP_STORE.items.map(getData);
  return (
    <>
      <Table
        title={'Config Maps'}
        columns={columns}
        dataSource={dataSource}
        onRow={(record) => ({
          onClick: () => {
            const { key } = record;
            const configMap = CONFIG_MAP_STORE.items.filter(
              (configMap) => configMap.getName() === key
            )[0];
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

export default observer(ConfigMapOverviewPage);
