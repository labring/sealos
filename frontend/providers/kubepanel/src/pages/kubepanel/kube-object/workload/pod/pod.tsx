import { Pod } from '@/k8slens/kube-object';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { keys } from 'lodash';
import ContainerStatusBrick from './container-status-brick';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { renderContainerStateTooltipTitle } from './container-status';
import { PodStatusMessage } from '@/constants/pod';
import PodStatus from './pod-status';
import PodDetail from './pod-detail';
import { usePodStore } from '@/store/kube';
import { PanelTable } from '@/components/common/panel-table/table';
import { ActionButton } from '@/components/common/action/action-button';

const columns: ColumnsType<Pod> = [
  {
    title: 'Containers',
    key: 'containers',
    render: (_, pod) => {
      const containers = pod.getContainers().map((container) => {
        const status = pod.getContainerStatuses().find((status) => status.name === container.name);
        const state = status ? keys(status?.state ?? {})[0] : '';
        return {
          name: container.name,
          state,
          status
        };
      });
      return (
        <div>
          {containers.map(({ name, state, status }) => (
            <Tooltip key={name} title={renderContainerStateTooltipTitle(name, state, status)}>
              {/* wrapper */}
              <span>
                <ContainerStatusBrick state={state} status={status} />
              </span>
            </Tooltip>
          ))}
        </div>
      );
    }
  },
  {
    title: 'Restarts',
    key: 'restarts',
    render: (_, pod) => pod.getRestartsCount()
  },
  {
    title: 'Controlled By',
    key: 'controlled-by',
    render: (_, pod) => pod.getOwnerRefs().map(({ name, kind }) => <span key={name}>{kind}</span>)
  },
  {
    title: 'QoS',
    dataIndex: 'qosClass',
    key: 'qos-class'
  },
  {
    title: 'Age',
    dataIndex: 'creationTimestamp',
    key: 'age',
    render: (_, pod) => <KubeObjectAge obj={pod} />
  },
  {
    title: 'Status',
    fixed: 'right',
    key: 'status',
    filters: PodStatusMessage.map((value) => ({ text: value, value })),
    onFilter: (value, pod) => pod.getStatusMessage() === value,
    render: (_, pod) => <PodStatus status={pod.getStatusMessage()} />
  },
  {
    fixed: 'right',
    key: 'action',
    render: (_, pod) => <ActionButton obj={pod} />
  }
];

const PodOverviewPage = () => {
  const { items, initialize, isLoaded, watch } = usePodStore();

  return (
    <PanelTable
      columns={columns}
      loading={!isLoaded}
      dataSource={items}
      sectionTitle="Pods"
      DetailDrawer={PodDetail}
      getRowKey={(pod) => pod.getId()}
      getDetailItem={(pod) => pod}
      initializers={[initialize]}
      watchers={[watch]}
    />
  );
};

export default PodOverviewPage;
