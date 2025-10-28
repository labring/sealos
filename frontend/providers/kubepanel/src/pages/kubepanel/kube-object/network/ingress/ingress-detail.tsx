import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import {
  ComputedIngressRoute,
  ILoadBalancerIngress,
  Ingress,
  computeRuleDeclarations
} from '@/k8slens/kube-object';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { DrawerTitle } from '@/components/common/drawer/drawer-title';
import { DrawerTitle } from '@/components/common/drawer/drawer-title';
import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { Button, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { useState } from 'react';
import IngressVisualEditorDrawer from './ingress-visual-editor-drawer';
import { useIngressStore } from '@/store/kube';

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
    <Table
      size="small"
      bordered
      columns={pointsColumns}
      dataSource={points}
      pagination={false}
      rowKey={(rec, idx) =>
        rec.hostname ? `host-${rec.hostname}` : rec.ip ? `ip-${rec.ip}` : `idx-${idx}`
      }
    />
    <Table
      size="small"
      bordered
      columns={pointsColumns}
      dataSource={points}
      pagination={false}
      rowKey={(rec, idx) =>
        rec.hostname ? `host-${rec.hostname}` : rec.ip ? `ip-${rec.ip}` : `idx-${idx}`
      }
    />
  );
};

const IngressDetail = ({ obj: ingress, open, onClose }: DetailDrawerProps<Ingress>) => {
  if (!ingress || !(ingress instanceof Ingress)) return null;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const { items, initialize } = useIngressStore();
  const latest = items.find((it) => it.getId() === ingress.getId()) ?? ingress;
  const port = latest.getServiceNamePort();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { items, initialize } = useIngressStore();
  const latest = items.find((it) => it.getId() === ingress.getId()) ?? ingress;
  const port = latest.getServiceNamePort();
  return (
    <Drawer open={open} title={`Ingress: ${latest.getName()}`} onClose={onClose}>
    <Drawer open={open} title={`Ingress: ${latest.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={latest} />
        <DrawerItem name="Ports" value={latest.getPorts()} />
        <KubeObjectInfoList obj={latest} />
        <DrawerItem name="Ports" value={latest.getPorts()} />
        <DrawerItem
          name="TLS"
          value={latest.spec.tls.map((tls, idx) => (
            <p key={tls.secretName || idx}>{tls.secretName}</p>
          value={latest.spec.tls.map((tls, idx) => (
            <p key={tls.secretName || idx}>{tls.secretName}</p>
          ))}
        />
        {port && <DrawerItem name="Service" value={`${port.serviceName}:${port.servicePort}`} />}
      </DrawerPanel>
      <DrawerPanel
        title={
          <DrawerTitle>
            <div className="flex items-center justify-between">
              <span>Rules</span>
              <Button size="small" type="link" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
            </div>
          </DrawerTitle>
        }
      >
        {latest.getRules().map((rule, idx) => (
          <div key={rule.host || idx}>
      <DrawerPanel
        title={
          <DrawerTitle>
            <div className="flex items-center justify-between">
              <span>Rules</span>
              <Button size="small" type="link" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
            </div>
          </DrawerTitle>
        }
      >
        {latest.getRules().map((rule, idx) => (
          <div key={rule.host || idx}>
            {rule.http && (
              <Table
                size="small"
                bordered
                columns={rulesColumns}
                dataSource={computeRuleDeclarations(latest, rule)}
                dataSource={computeRuleDeclarations(latest, rule)}
                pagination={false}
                rowKey={(record) => record.url}
                rowKey={(record) => record.url}
                title={() => <>{rule.host && `Host: ${rule.host}`}</>}
              />
            )}
          </div>
        ))}
      </DrawerPanel>
      <DrawerPanel title="Load-Balancer Ingress Points">
        <IngressPoints points={latest.status?.loadBalancer.ingress} />
        <IngressPoints points={latest.status?.loadBalancer.ingress} />
      </DrawerPanel>
      <IngressVisualEditorDrawer
        ingress={latest}
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        onOk={() => {
          // Refresh the store to ensure the detail view shows the latest rules immediately
          initialize(() => {});
          setIsEditOpen(false);
        }}
      />
      <IngressVisualEditorDrawer
        ingress={latest}
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        onOk={() => {
          // Refresh the store to ensure the detail view shows the latest rules immediately
          initialize(() => {});
          setIsEditOpen(false);
        }}
      />
    </Drawer>
  );
};

export default IngressDetail;
