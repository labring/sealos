import { Section } from '@/components/common/section/section';
import Title from '@/components/common/title/title';
import { APICallback, KubeStoreAction, WatchCloser } from '@/types/state';
import { TableProps } from 'antd';
import { Table } from 'antd';
import useNotification from 'antd/lib/notification/useNotification';
import { useCallback, useEffect, useState } from 'react';

type DefaultRecordType = Record<string, any>;

interface Props<RecordType = unknown, Item = any> extends Omit<TableProps<RecordType>, 'title'> {
  sectionTitle: string;
  getRowKey: (record: RecordType) => string;
  getDetailItem: (record: RecordType) => Item;
  initializers: Array<KubeStoreAction<any>['initialize']>;
  watchers: Array<KubeStoreAction<any>['watch']>;
  DetailDrawer: (props: DetailDrawerProps<Item>) => JSX.Element | null;
}

const PanelTable = <RecordType extends DefaultRecordType, Item = any>(
  tableProps: Props<RecordType, Item>
) => {
  const {
    scroll = { x: true },
    pagination = false,
    sectionTitle: title,
    DetailDrawer,
    getRowKey,
    getDetailItem,
    initializers,
    watchers
  } = tableProps;
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [watchTrigger, setWatchTrigger] = useState(false);
  const [notifyApi, cxtHolder] = useNotification({ placement: 'topRight' });

  const trigger = useCallback<APICallback>((_, e) => {
    if (e) {
      if (e.code === 410) {
        notifyApi.error({
          description: 'Resource version is too old, you need to refresh the page',
          message: 'Outdated Resource'
        });
        setWatchTrigger(!watchTrigger);
        return;
      }
      notifyApi.error({
        description: (
          <div>
            <p>code: {e.error.errno}</p>
            <p>{e.error.message}</p>
          </div>
        ),
        message: e.error.reason,
        duration: 5
      });
    }
  }, []);

  useEffect(() => {
    let closers: Array<WatchCloser>;
    Promise.allSettled(initializers.map((initializer) => initializer(trigger))).finally(() => {
      closers = watchers.map((watcher) => watcher(trigger));
    });
    return () => closers.forEach((c) => c());
  }, [watchTrigger]);

  return (
    <Section>
      {cxtHolder}
      <Title type="primary">{title}</Title>
      <Table
        {...tableProps}
        rowKey={getRowKey}
        scroll={scroll}
        pagination={pagination}
        rowClassName="cursor-pointer"
        onRow={(record) => ({
          onClick: () => {
            setSelectedItem(getDetailItem(record));
            setOpenDetail(true);
          }
        })}
      />
      {/* nextjs prerender fix */}
      {DetailDrawer && (
        <DetailDrawer open={openDetail} obj={selectedItem} onClose={() => setOpenDetail(false)} />
      )}
    </Section>
  );
};

export default PanelTable;
