import Title from '@/components/common/title/title';
import { KubeObjectAge } from '@/components/kube/object/kube-object-age';
import { ReactiveDuration } from '@/components/kube/reactive-duration';
import { KubeEvent, ObjectReference } from '@/k8slens/kube-object';
import { useEventStore } from '@/store/k8s/event.store';
import { APICallback } from '@/types/state';
import { Table, Tooltip } from 'antd';
import useNotification from 'antd/lib/notification/useNotification';
import { ColumnsType } from 'antd/lib/table';
import { useCallback, useEffect } from 'react';

const columns: ColumnsType<KubeEvent> = [
  {
    title: <Title type="table">Type</Title>,
    key: 'type',
    dataIndex: 'type',
    render: (type: string | undefined) => {
      if (!type) return 'Unknown';
      return type;
    }
  },
  {
    title: <Title type="table">Message</Title>,
    key: 'message',
    ellipsis: true,
    dataIndex: 'message',
    render: (message: string | undefined, event: KubeEvent) => {
      if (!message) return '<unknown>';

      let renderedMessage: React.ReactNode;
      switch (event.type) {
        case 'Warning':
          renderedMessage = <span className="text-color-error">{message}</span>;
          break;
        case 'Normal':
        default:
          renderedMessage = message;
      }
      return <Tooltip title={message}>{renderedMessage}</Tooltip>;
    }
  },
  {
    title: <Title type="table">Involved Object</Title>,
    key: 'involved-object',
    dataIndex: 'involvedObject',
    render: (involvedObject: Required<ObjectReference> | undefined) => {
      if (!involvedObject) return '<unknown>';
      return <span className="text-blue-300">{involvedObject.name}</span>;
    }
  },
  {
    title: <Title type="table">Source</Title>,
    key: 'source',
    render: (_, event: KubeEvent) => event.getSource()
  },
  {
    title: <Title type="table">Count</Title>,
    dataIndex: 'count',
    key: 'count',
    render: (count: number | undefined) => {
      if (!count) return '<unknown>';
      return count;
    }
  },
  {
    title: <Title type="table">Age</Title>,
    key: 'age',
    render: (_, event: KubeEvent) => {
      return <KubeObjectAge obj={event} />;
    }
  },
  {
    title: <Title type="table">Last Seen</Title>,
    key: 'last-seen',
    render: (_, event: KubeEvent) => {
      return <ReactiveDuration timestamp={event.lastTimestamp} />;
    }
  }
];

const EventOverview = () => {
  const { items, initialize, isLoaded } = useEventStore();
  const [notifyApi, cxtHolder] = useNotification();
  const callback = useCallback<APICallback>(
    (_, e) => {
      if (e) {
        notifyApi.error({
          message: e.error.reason,
          description: e.error.message,
          duration: 5
        });
      }
    },
    [notifyApi]
  );

  useEffect(() => {
    initialize(callback);
  }, []);

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
      />
    </>
  );
};

export default EventOverview;
