import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import {
  KubeObject,
  KubeObjectMetadata,
  KubeObjectScope,
  Service,
  computeRouteDeclarations
} from '@/k8slens/kube-object';
import { ColumnsType } from 'antd/lib/table';
import { useServiceStore } from '@/store/kube';
import { Button } from 'antd';
import ServiceDetail from './service-detail';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Service> = [
  {
    title: 'ClusterIps',
    key: 'ClusterIps',
    render: (_, service: Service) => service.getClusterIps().map((ip) => <p key={ip}>{ip}</p>)
  },
  {
    title: 'Type',
    key: 'type',
    render: (_, service: Service) => <span>{service.getType()}</span>
  },
  {
    title: 'Selector',
    key: 'selector',
    render: (_, service: Service) =>
      service.getSelector().map((selector) => <p key={selector}>{selector}</p>)
  },
  {
    title: 'Ports',
    key: 'ports',
    render: (_, service: Service) =>
      service.getPorts().map((port) => (
        <div key={port.toString()} className="overflow-hidden">
          {port.toString()}
        </div>
      ))
  },
  {
    title: 'Load Balancer IPs',
    key: 'load-balancer-ips',
    render: (_, service: Service) => service.getExternalIps().map((ip) => <p key={ip}>{ip}</p>)
  },
  {
    title: 'Status',
    key: 'status',
    render: (_, service: Service) => <span>{service.getStatus()}</span>
  }
];

const ServiceOverviewPage = () => {
  const { items, initialize, isLoaded, watch } = useServiceStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="service"
      DetailDrawer={ServiceDetail}
      getRowKey={(service) => service.getId()}
      initializers={[initialize]}
      watchers={[watch]}
      getDetailItem={(service) => service}
    />
  );
};

export default ServiceOverviewPage;
