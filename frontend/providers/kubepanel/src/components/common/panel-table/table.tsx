import { Section } from '@/components/common/section/section';
import Title from '@/components/common/title/title';
import { useWatcher } from '@/hooks/useWatcher';
import { KubeObject } from '@/k8slens/kube-object';
import { KubeStoreAction } from '@/types/state';
import { Table, TableProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { PanelPagination } from './pagination';
import { useSearchNameFilterProps } from './search-filter';

type DefaultRecordType = Record<string, any>;

export interface DetailDrawerProps<T = any> {
  open: boolean;
  obj: T | null;
  onClose: () => void;
}

interface Props<RecordType = unknown, Item = any> extends Omit<TableProps<RecordType>, 'title'> {
  sectionTitle: string;
  getRowKey: (record: RecordType) => string;
  getDetailItem: (record: RecordType) => Item;
  initializers: Array<KubeStoreAction<any>['initialize']>;
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
    initializers
  } = tableProps;

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const cxtHolder = useWatcher({ initializers });
  const searchNameFilterProps = useSearchNameFilterProps<RecordType>((_, record) =>
    getDetailItem(record).getName()
  );

  const dataSource = useMemo(() => tableProps.dataSource || [], [tableProps.dataSource]);

  // Apply filter based on searchText
  const filteredData = useMemo(() => {
    return dataSource.filter(searchNameFilterProps.filterFn);
  }, [dataSource, searchNameFilterProps.filterFn]);

  const total = filteredData.length;

  // Reset to page 1 when search text changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchNameFilterProps.searchText]);

  // Calculate current page data after filtering
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  const modifiedCols = useMemo(() => {
    const { searchText, filterFn, ...filterProps } = searchNameFilterProps;
    return [
      {
        title: 'Name',
        key: 'name',
        className: 'min-w-[150px]',
        ellipsis: true,
        ...filterProps
      },
      ...columns
    ];
  }, [columns, searchNameFilterProps]);

  return (
    <Section>
      {cxtHolder}
      <Title type="primary">{title}</Title>
      <Table
        className="kubepanel-table"
        size="middle"
        {...tableProps}
        dataSource={currentData}
        columns={modifiedCols}
        rowKey={getRowKey}
        scroll={scroll}
        pagination={false}
        rowClassName="cursor-pointer"
        onRow={(record) => ({
          onClick: () => {
            setSelectedItem(getDetailItem(record));
            setOpenDetail(true);
          }
        })}
      />
      {total > 0 && (
        <PanelPagination
          total={total}
          current={currentPage}
          pageSize={PAGE_SIZE}
          onChange={(page) => setCurrentPage(page)}
        />
      )}
      {/* nextjs prerender fix */}
      {DetailDrawer && (
        <DetailDrawer open={openDetail} obj={selectedItem} onClose={() => setOpenDetail(false)} />
      )}
    </Section>
  );
};
