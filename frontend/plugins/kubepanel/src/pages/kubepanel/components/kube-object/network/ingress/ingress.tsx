import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Ingress, computeRouteDeclarations } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { updateResource } from '@/api/update';
import { Resources } from '@/constants/kube-object';
import Table from '../../../table/table';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchData, useIngressStore } from '@/store/kube';
import { Button } from 'antd';
import IngressDetail from './ingress-detail';

const columns: ColumnsType<Ingress> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, ingress) => ingress.getName()
  },
  {
    title: 'LoadBalancers',
    key: 'load-balancers',
    render: (_, ingress) => ingress.getLoadBalancers().map((lb) => <p key={lb}>{lb}</p>)
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, ingress) => <KubeObjectAge obj={ingress} />
  },
  {
    title: 'Rules',
    key: 'rules',
    render: (_, ingress) =>
      computeRouteDeclarations(ingress).map((decl) => (
        <div key={decl.url} className="overflow-hidden">
          {decl.displayAsLink ? (
            <>
              <Button
                href={decl.url}
                rel="noreferrer"
                target="_blank"
                type="link"
                onClick={(e) => e.stopPropagation()}
                style={{ padding: 0, display: 'inline' }}
              >
                {decl.url}
              </Button>
              {` ⇢ ${decl.service}`}
            </>
          ) : (
            <>{`${decl.url} ⇢ ${decl.service}`}</>
          )}
        </div>
      ))
  },
  {
    key: 'action',
    fixed: 'right',
    render: (_, ingress) => (
      <ActionButton
        obj={ingress}
        onUpdate={(data: string) => updateResource(data, ingress.getName(), Resources.Ingresses)}
        onDelete={() => deleteResource(ingress.getName(), Resources.Ingresses)}
      />
    )
  }
];

const IngressOverviewPage = () => {
  const [ingress, setIngress] = useState<Ingress>();
  const [openDrawer, setOpenDrawer] = useState(false);
  const { items, replace } = useIngressStore();

  useQuery(['ingresss'], () => fetchData(replace, Resources.Ingresses), { refetchInterval: 5000 });

  return (
    <>
      <Table
        title={'Ingresses'}
        columns={columns}
        dataSource={items}
        onRow={(ingress) => ({
          onClick: () => {
            setIngress(ingress);
            setOpenDrawer(true);
          }
        })}
      />
      <IngressDetail obj={ingress} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default IngressOverviewPage;
