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
    title: 'Age',
    key: 'age',
    render: (_, ingress) => <KubeObjectAge obj={ingress} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, ingress) => <ActionButton obj={ingress} />
  }
];

const IngressOverviewPage = () => {
  const { items, initialize, isLoaded } = useIngressStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Ingresses"
      DetailDrawer={IngressDetail}
      getRowKey={(ingress) => ingress.getId()}
      initializers={[initialize]}
      getDetailItem={(ingress) => ingress}
    />
  );
};

export default IngressOverviewPage;
