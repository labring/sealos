import { ConfigProvider, TableProps } from 'antd';
import { Table as AntdTable } from 'antd';
import { blue } from '@ant-design/colors';

type DefaultRecordType = Record<string, any>;
type PanelRender<RecordType> = (data: readonly RecordType[]) => React.ReactNode;

interface Props<RecordType = unknown> extends Omit<TableProps<RecordType>, 'title'> {
  title?: string | PanelRender<RecordType>;
}

const TableStringTile = ({ title }: { title: string }) => {
  return <span className="p-4 mb-4 text-xl font-light">{title}</span>;
};

function Table<RecordType extends DefaultRecordType>(tableProps: Props<RecordType>) {
  const { scroll = { x: true }, pagination = false, title } = tableProps;

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            rowHoverBg: blue[0]
          }
        }
      }}
    >
      <AntdTable
        {...tableProps}
        rowClassName="cursor-pointer"
        title={typeof title === 'string' ? () => <TableStringTile title={title} /> : title}
        scroll={scroll}
        pagination={pagination}
      />
    </ConfigProvider>
  );
}

export default Table;
