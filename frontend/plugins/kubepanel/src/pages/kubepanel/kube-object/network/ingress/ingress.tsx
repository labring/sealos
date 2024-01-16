import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { Ingress, computeRouteDeclarations } from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import { useIngressStore } from '@/store/kube';
import { Button } from 'antd';
import IngressDetail from './ingress-detail';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Ingress> = [
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
    fixed: 'right',
    key: 'action',
    render: (_, ingress) => <ActionButton obj={ingress} />
  }
];

const IngressOverviewPage = () => {
  const { items, initialize, isLoaded, watch } = useIngressStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Ingresses"
      DetailDrawer={IngressDetail}
      getRowKey={(ingress) => ingress.getId()}
      initializers={[initialize]}
      watchers={[watch]}
      getDetailItem={(ingress) => ingress}
    />
  );
};

export default IngressOverviewPage;
