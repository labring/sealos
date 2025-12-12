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
    render: (_, service: Service) => (
      <div className="flex flex-col gap-0.5">
        {service.getClusterIps().map((ip) => (
          <span key={ip} className="leading-snug">
            {ip}
          </span>
        ))}
      </div>
    )
  },
  {
    title: 'Type',
    key: 'type',
    render: (_, service: Service) => <span>{service.getType()}</span>
  },
  {
    title: 'Selector',
    key: 'selector',
    render: (_, service: Service) => (
      <div className="flex flex-col gap-0.5">
        {service.getSelector().map((selector) => (
          <span key={selector} className="leading-snug">
            {selector}
          </span>
        ))}
      </div>
    )
  },
  {
    title: 'Ports',
    key: 'ports',
    render: (_, service: Service) => (
      <div className="flex flex-col gap-0.5">
        {service.getPorts().map((port) => (
          <span key={port.toString()} className="leading-snug">
            {port.toString()}
          </span>
        ))}
      </div>
    )
  },
  {
    title: 'Status',
    key: 'status',
    render: (_, service: Service) => <span>{service.getStatus()}</span>
  },
  {
    title: 'Age',
    key: 'age',
    render: (_, service: Service) => <KubeObjectAge key="age" obj={service} />
  },
  {
    key: 'action',
    fixed: 'right',
    width: 20,
    render: (_, service: Service) => <ActionButton obj={service} />
  }
];

const ServiceOverviewPage = () => {
  const { items, initialize, isLoaded } = useServiceStore();

  return (
    <PanelTable
      columns={columns}
      dataSource={items}
      loading={!isLoaded}
      sectionTitle="Services"
      DetailDrawer={ServiceDetail}
      getRowKey={(service) => service.getId()}
      initializers={[initialize]}
      getDetailItem={(service) => service}
    />
  );
};

export default ServiceOverviewPage;
