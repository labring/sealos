import { KubeBadge } from '@/components/kube/kube-badge';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Secret } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { updateResource } from '@/api/update';
import { Resources } from '@/constants/kube-object';
import Table from '../../../table/table';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchData, useSecretStore } from '@/store/kube';
import SecretDetail from './secret-detail';

const columns: ColumnsType<Secret> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, secret) => secret.getName()
  },
  {
    title: 'Labels',
    key: 'labels',
    render: (_, secret) =>
      secret.getLabels().map((label) => <KubeBadge key={label} label={label} expandable={false} />)
  },
  {
    title: 'Keys',
    key: 'keys',
    render: (_, secret) => secret.getKeys().join(', ')
  },
  {
    title: 'Type',
    key: 'type',
    dataIndex: 'type'
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, secret) => <KubeObjectAge obj={secret} />
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, secret) => (
      <ActionButton
        obj={secret}
        onUpdate={(data: string) => updateResource(data, secret.getName(), Resources.Secrets)}
        onDelete={() => deleteResource(secret.getName(), Resources.Secrets)}
      />
    )
  }
];

const SecretOverviewPage = () => {
  const [secret, setSecret] = useState<Secret>();
  const [openDrawer, setOpenDrawer] = useState(false);
  const { items, replace } = useSecretStore();

  useQuery(['secrets'], () => fetchData(replace, Resources.Secrets), { refetchInterval: 5000 });

  return (
    <>
      <Table
        title={'Secrets'}
        columns={columns}
        dataSource={items}
        onRow={(secret) => ({
          onClick: () => {
            setSecret(secret);
            setOpenDrawer(true);
          }
        })}
      />
      <SecretDetail obj={secret} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default SecretOverviewPage;
