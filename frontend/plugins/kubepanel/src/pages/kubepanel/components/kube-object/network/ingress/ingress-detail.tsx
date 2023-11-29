import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import {
  ComputedIngressRoute,
  ILoadBalancerIngress,
  Ingress,
  computeRuleDeclarations
} from '@/k8slens/kube-object';
import { DetailDrawerProps } from '@/types/detail';
import DrawerPanel from '../../../drawer/drawer-panel';
import Drawer from '../../../drawer/drawer';
import { DrawerItem } from '../../../drawer/drawer-item';
import { Button, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';

const rulesColumns: ColumnsType<ComputedIngressRoute> = [
  {
    key: 'path',
    title: 'Path',
    dataIndex: 'pathname',
    render: (pathname: string) => (pathname === '' ? '_' : pathname)
  },
  {
    key: 'link',
    title: 'Link',
    render: (_, { displayAsLink, url }) =>
      displayAsLink ? (
        <Button
          href={url}
          rel="noreferrer"
          target="_blank"
          type="link"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </Button>
      ) : (
        url
      )
  },
  {
    key: 'backends',
    title: 'Backends',
    dataIndex: 'service'
  }
];

const IngressRules = ({ ingress }: { ingress: Ingress }) => {
  return ingress
    .getRules()
    .map((rule, idx) => (
      <div key={idx}>
        {rule.http && (
          <Table
            size="small"
            bordered
            columns={rulesColumns}
            dataSource={computeRuleDeclarations(ingress, rule)}
            pagination={false}
            title={() => <>{rule.host && `Host: ${rule.host}`}</>}
          />
        )}
      </div>
    ));
};

const pointsColumns: ColumnsType<ILoadBalancerIngress> = [
  {
    key: 'hostname',
    title: 'Hostname',
    dataIndex: 'hostname',
    render: (hostname?: string) => (hostname ? '_' : hostname)
  },
  {
    key: 'ip',
    title: 'IP',
    dataIndex: 'ip',
    render: (ip?: string) => (ip ? '_' : ip)
  }
];

const IngressPoints = ({ points }: { points?: ILoadBalancerIngress[] }) => {
  if (!points || points.length === 0) {
    return null;
  }

  return (
    <Table size="small" bordered columns={pointsColumns} dataSource={points} pagination={false} />
  );
};

const IngressDetail = ({ obj, open, onClose }: DetailDrawerProps<Ingress>) => {
  if (!obj || !(obj instanceof Ingress)) return null;

  const port = obj.getServiceNamePort();
  return (
    <Drawer open={open} title={`Ingress: ${obj.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={obj} />
        <DrawerItem name="Ports" value={obj.getPorts()} />
        <DrawerItem
          name="TLS"
          value={obj.spec.tls.map((tls, idx) => (
            <p key={idx}>{tls.secretName}</p>
          ))}
        />
        {port && <DrawerItem name="Service" value={`${port.serviceName}:${port.servicePort}`} />}
      </DrawerPanel>
      <DrawerPanel title="Rules">
        <IngressRules ingress={obj} />
      </DrawerPanel>
      <DrawerPanel title="Load-Balancer Ingress Points">
        <IngressPoints points={obj.status?.loadBalancer.ingress} />
      </DrawerPanel>
    </Drawer>
  );
};

export default IngressDetail;
