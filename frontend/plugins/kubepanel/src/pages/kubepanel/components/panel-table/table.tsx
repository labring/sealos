import { Section } from '@/components/common/section/section';
import Title from '@/components/common/title/title';
import { useWatcher } from '@/hooks/useWatcher';
import { KubeStoreAction } from '@/types/state';
import { TableProps } from 'antd';
import { Table } from 'antd';
import { useState } from 'react';

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
  const cxtHolder = useWatcher({ initializers, watchers });

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
