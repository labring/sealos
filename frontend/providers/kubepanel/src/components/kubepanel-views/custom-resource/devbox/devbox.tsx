import { Devbox } from '@/k8slens/kube-object/src/specifics/devbox';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { PanelTable } from '@/components/common/panel-table/table';
import { useDevboxStore } from '@/store/kube';
import { ActionButton } from '@/components/common/action/action-button';
import DevboxDetail from './devbox-detail';
import type { ColumnsType } from 'antd/es/table';
import { StatusTag } from '@/components/common/status-tag';

const getStateColor = (state: string) => {
  switch (state.toLowerCase()) {
    case 'running':
      return 'green';
    case 'stopped':
      return 'default';
    case 'pending':
      return 'orange';
    case 'error':
    case 'failed':
      return 'red';
    default:
      return 'blue';
  }
};

const columns: ColumnsType<Devbox> = [
  {
    title: 'State',
    key: 'state',
    render: (_, devbox) => (
      <StatusTag color={getStateColor(devbox.getState())}>{devbox.getState()}</StatusTag>
    )
  },
  {
    title: 'CPU',
    key: 'cpu',
    render: (_, devbox) => devbox.getCpu() || '-'
  },
  {
    title: 'Memory',
    key: 'memory',
    render: (_, devbox) => devbox.getMemory() || '-'
  },
  {
    title: 'Storage',
    key: 'storage',
    render: (_, devbox) => devbox.getStorageLimit() || '-'
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, devbox) => <KubeObjectAge obj={devbox} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, devbox) => <ActionButton obj={devbox} />
  }
];

const DevboxPage = () => {
  const { items, initialize, isLoaded } = useDevboxStore();

  return (
    <PanelTable<Devbox, Devbox>
      columns={columns}
      loading={!isLoaded}
      dataSource={items}
      sectionTitle="Devbox"
      getRowKey={(devbox) => devbox.getId()}
      getDetailItem={(devbox) => devbox}
      DetailDrawer={DevboxDetail}
      initializers={[initialize]}
    />
  );
};

export default DevboxPage;
