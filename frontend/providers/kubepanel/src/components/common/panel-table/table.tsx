import { Section } from '@/components/common/section/section';
import Title from '@/components/common/title/title';
import { useWatcher } from '@/hooks/useWatcher';
import { KubeStoreAction } from '@/types/state';
import { TableProps } from 'antd';
import { Table } from 'antd';
import { useMemo, useState } from 'react';
import { usePaginationProps } from './pagination';
import { KubeObject } from '@/k8slens/kube-object';
import { useSearchNameFilterProps } from './search-filter';

type DefaultRecordType = Record<string, any>;

interface Props<RecordType = unknown, Item = any> extends Omit<TableProps<RecordType>, 'title'> {
  sectionTitle: string;
  getRowKey: (record: RecordType) => string;
  getDetailItem: (record: RecordType) => Item;
  initializers: Array<KubeStoreAction<any>['initialize']>;
  watchers: Array<KubeStoreAction<any>['watch']>;
  DetailDrawer: (props: DetailDrawerProps<Item>) => JSX.Element | null;
}

export const PanelTable = <RecordType extends DefaultRecordType, Item extends KubeObject>(
  tableProps: Props<RecordType, Item>
) => {
  const {
    scroll = { x: true },
    sectionTitle: title,
    columns = [],
    DetailDrawer,
    getRowKey,
    getDetailItem,
    initializers,
    watchers
  } = tableProps;
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const cxtHolder = useWatcher({ initializers, watchers });
  const searchNameFilterProps = useSearchNameFilterProps<RecordType>((_, record) =>
    getDetailItem(record).getName()
  );
  const paginationProps = usePaginationProps(tableProps.dataSource?.length || 0);

  const modifiedCols = useMemo(
    () => [
      { title: 'Name', key: 'name', fixed: 'left' as 'left', ...searchNameFilterProps },
      ...columns
    ],
    [columns, searchNameFilterProps]
  );

  return (
    <Section>
      {cxtHolder}
      <Title type="primary">{title}</Title>
      <Table
        {...tableProps}
        columns={modifiedCols}
        rowKey={getRowKey}
        scroll={scroll}
        pagination={paginationProps}
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
