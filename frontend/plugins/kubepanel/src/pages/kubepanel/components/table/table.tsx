import { TableProps } from 'antd';
import { Table as AntdTable } from 'antd';

type DefaultRecordType = Record<string, any>;
type PanelRender<RecordType> = (data: readonly RecordType[]) => React.ReactNode;

interface Props<RecordType = unknown> extends Omit<TableProps<RecordType>, 'title'> {
  title?: string | PanelRender<RecordType>;
}

const TableStringTile = ({ title }: { title: string }) => {
  return <span className="text-2xl font-medium">{title}</span>;
};

function Table<RecordType extends DefaultRecordType>(tableProps: Props<RecordType>) {
  const { scroll = { x: true }, pagination = false, title } = tableProps;

  return (
    <AntdTable
      {...tableProps}
      rowClassName="cursor-pointer"
      title={typeof title === 'string' ? () => <TableStringTile title={title} /> : title}
      scroll={scroll}
      pagination={pagination}
    />
  );
}

export default Table;
