import { DrawerItem } from '@/components/common/drawer/drawer-item';
import { Collapse } from 'antd';

interface Props {
  children: React.ReactNode;
  header?: {
    name: string;
    value?: React.ReactNode;
  };
}
export const DrawerCollapse = ({ children, header }: Props) => {
  if (!header) return null;
  return (
    <Collapse
      className="bg-transparent rounded-none [&_.ant-collapse-header]:p-0! [&_.ant-collapse-content-box]:p-0!"
      expandIconPosition="end"
      bordered={false}
    >
      <Collapse.Panel header={<DrawerItem name={header.name} value={header.value} />} key="1">
        {children}
      </Collapse.Panel>
    </Collapse>
  );
};
