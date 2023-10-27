import { Pod, PodContainerStatus } from '@/k8slens/kube-object';
import { Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { keys } from 'lodash';
import ContainerStatusBrick from './container-status-brick';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { observer } from 'mobx-react';
import { renderContainerStateTooltipTitle } from './container-status';
import { PodStatusMessage } from '@/constants/pod';
import PodStatus from './pod-status';
import { POD_STORE } from '@/store/static';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PodDetail from './pod-detail';

interface ContainerDataType {
  name: string;
  state: string;
  status: PodContainerStatus | null | undefined;
}

interface DataType {
  key: string;
  name: string;
  containers: Array<ContainerDataType>;
  restarts: number;
  ownerRefs: Array<{
    name: string;
    kind: string;
  }>;
  qosClass: string;
  creationTimestamp?: string;
  status: string;
}

const getData = (pod: Pod): DataType => {
  return {
    key: pod.getName(),
    name: pod.getName(),
    containers: pod.getContainers().map((container) => {
      const status = pod.getContainerStatuses().find((status) => status.name === container.name);
      const state = status ? keys(status?.state ?? {})[0] : '';
      return {
        name: container.name,
        state,
        status
      };
    }),
    restarts: pod.getRestartsCount(),
    ownerRefs: pod.getOwnerRefs(),
    qosClass: pod.getQosClass(),
    creationTimestamp: pod.metadata.creationTimestamp,
    status: pod.getStatusMessage()
  };
};

const columns: ColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    fixed: 'left'
  },
  {
    title: 'Containers',
    dataIndex: 'containers',
    key: 'containers',
    render: (containers: Array<ContainerDataType>) => (
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
    )
  },
  {
    title: 'Restarts',
    dataIndex: 'restarts',
    key: 'restarts'
  },
  {
    title: 'Controlled By',
    dataIndex: 'ownerRefs',
    key: 'controlled-by',
    render: (ownerRefs: Array<{ name: string; kind: string }>) =>
      ownerRefs.map(({ name, kind }) => <>{kind}</>)
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
    render: (creationTimestamp: string) => <KubeObjectAge creationTimestamp={creationTimestamp} />
  },
  {
    title: 'Status',
    dataIndex: 'status',
    fixed: 'right',
    key: 'status',
    filters: PodStatusMessage.map((value) => ({ text: value, value })),
    onFilter: (value, record) => record.status === value,
    render: (status: string) => <PodStatus status={status} />
  }
];

const PodOverviewPage = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [pod, setPod] = useState<Pod>();

  useQuery(['pods'], () => POD_STORE.fetchData(), {
    refetchInterval: 5000
  });

  const dataSource = POD_STORE.items.map(getData);
  return (
    <>
      <Table
        title={() => <span className="p-4 mb-4 text-xl font-light">Pods</span>}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => {
            const { key } = record;
            const pod = POD_STORE.items.filter((pod) => pod.getName() === key)[0];
            setPod(pod);
            setOpenDrawer(true);
          }
        })}
      />
      <PodDetail pod={pod} open={openDrawer} onClose={() => setOpenDrawer(false)} />
    </>
  );
};

export default observer(PodOverviewPage);
