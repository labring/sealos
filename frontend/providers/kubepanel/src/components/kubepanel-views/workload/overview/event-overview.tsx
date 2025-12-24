import Title from '@/components/common/title/title';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ReactiveDuration } from '@/components/kube/reactive-duration';
import { useWatcher } from '@/hooks/useWatcher';
import { KubeEvent, ObjectReference } from '@/k8slens/kube-object';
import { useEventStore } from '@/store/k8s/event.store';
import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';

const columns: ColumnsType<KubeEvent> = [
  {
    title: <Title type="table">Type</Title>,
    key: 'type',
    dataIndex: 'type',
    fixed: 'start',
    width: 80,
    align: 'center',
    render: (type: string | undefined) => {
      if (!type) return 'Unknown';
      return type;
    }
  },
  {
    title: <Title type="table">Message</Title>,
    key: 'message',
    dataIndex: 'message',
    render: (message: string | undefined, event: KubeEvent) => {
      if (!message) return '<unknown>';

      switch (event.type) {
        case 'Warning':
          return <Typography.Text type="danger">{message}</Typography.Text>;
        case 'Normal':
        default:
          return message;
      }
    }
  },
  {
    title: <Title type="table">Involved Object</Title>,
    key: 'involved-object',
    dataIndex: 'involvedObject',
    render: (involvedObject: Required<ObjectReference> | undefined) => {
      if (!involvedObject) return '<unknown>';
      return <span className="text-[#0884DD]">{involvedObject.name}</span>;
    }
  },
  {
    title: <Title type="table">Source</Title>,
    key: 'source',
    width: 200,
    render: (_, event: KubeEvent) => event.getSource()
  },
  {
    title: <Title type="table">Count</Title>,
    dataIndex: 'count',
    key: 'count',
    width: 70,
    fixed: 'end',
    align: 'center',
    render: (count: number | undefined) => {
      if (!count) return '<unknown>';
      return count;
    }
  },
  {
    title: <Title type="table">Age</Title>,
    key: 'age',
    width: 80,
    fixed: 'end',
    align: 'center',
    render: (_, event: KubeEvent) => {
      return <KubeObjectAge obj={event} />;
    }
  },
  {
    title: <Title type="table">Last Seen</Title>,
    key: 'last-seen',
    width: 80,
    fixed: 'end',
    align: 'center',
    render: (_, event: KubeEvent) => {
      return <ReactiveDuration timestamp={event.lastTimestamp} />;
    }
  }
];

const EventOverview = () => {
  const { items, initialize, isLoaded } = useEventStore();
  const cxtHolder = useWatcher({ initializers: [initialize] });

  return (
    <>
      {cxtHolder}
      <Table
        loading={!isLoaded}
        size="middle"
        columns={columns}
        rowKey={(event) => event.getId()}
        dataSource={items.slice(0, 10)}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
};

export default EventOverview;
