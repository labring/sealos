import { Drawer } from '@/components/common/drawer/drawer';
import { DrawerPanel } from '@/components/common/drawer/drawer-panel';
import { KubeObjectInfoList } from '@/components/kube/object/detail/kube-object-detail-info-list';
import { ComputedIngressRoute, ILoadBalancerIngress, Service } from '@/k8slens/kube-object';
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

const ServiceDetail = ({ obj: service, open, onClose }: DetailDrawerProps<Service>) => {
  if (!service || !(service instanceof Service)) return null;
  return (
    <Drawer open={open} title={`Service: ${service.getName()}`} onClose={onClose}>
      <DrawerPanel>
        <KubeObjectInfoList obj={service} />
        <div className="flex items-center justify-between py-2 border-b border-[#E8E8E8]">
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Cluster IP</span>
            <span className="text-[#262626] text-xs">{service.getClusterIp()}</span>
          </div>
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Type</span>
            <span className="text-[#262626] text-xs">{service.getType()}</span>
          </div>
          <div>
            <span className="text-[#8C8C8C] font-medium text-sm block mb-1">Ports</span>
            <span className="text-[#262626] text-xs">
              {service
                .getPorts()
                .map((port) => port.toString())
                .join(', ')}
            </span>
          </div>
        </div>
      </DrawerPanel>
    </Drawer>
  );
};

export default ServiceDetail;
