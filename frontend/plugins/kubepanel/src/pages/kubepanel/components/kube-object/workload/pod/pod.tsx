import { Pod } from '@/k8slens/kube-object';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { keys } from 'lodash';
import ContainerStatusBrick from './container-status-brick';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { renderContainerStateTooltipTitle } from './container-status';
import { PodStatusMessage } from '@/constants/pod';
import PodStatus from './pod-status';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PodDetail from './pod-detail';
import Table from '../../../table/table';
import ActionButton from '../../../action-button/action-button';
import { deleteResource } from '@/api/delete';
import { Resources } from '@/constants/kube-object';
import { updateResource } from '@/api/update';
import { fetchData, usePodStore } from '@/store/kube';

const columns: ColumnsType<Pod> = [
  {
    title: 'Name',
    key: 'name',
    fixed: 'left',
    render: (_, pod) => pod.getName()
  },
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
    key: 'action',
    fixed: 'right',
    render: (_, pod) => (
      <ActionButton
        obj={pod}
        onDelete={() => deleteResource(pod.getName(), Resources.Pods)}
        onUpdate={(data: string) => updateResource(data, pod.getName(), Resources.Pods)}
      />
    )
  }
];

const PodOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [pod, setPod] = useState<Pod>();
  const { items, replace } = usePodStore();

  useQuery(['pods'], () => fetchData(replace, Resources.Pods), {
    refetchInterval: 5000
  });

  return (
    <>
      <Table
        title={'Pods'}
        columns={columns}
        dataSource={items}
        onRow={(pod) => ({
          onClick: () => {
            setPod(pod);
            setOpenDrawer(true);
          }
        })}
      />
      <PodDetail pod={pod} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default PodOverviewPage;
