import { CloseOutlined } from '@ant-design/icons';
import { Drawer as AntdDrawer } from 'antd';
interface Props {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  width?: string | number;
  extra?: React.ReactNode;
}
export const Drawer = ({ title, children, open, onClose, width = '550px', extra }: Props) => {
  return (
    <AntdDrawer
      styles={{
        header: {
          padding: '16px 24px'
        }
      }}
      open={open}
      closeIcon={<CloseOutlined style={{ fontSize: '18px' }} />}
      title={<span className="text-gray-900 font-medium text-base">{title}</span>}
      width={width}
      extra={extra}
      onClose={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-6">{children}</div>
    </AntdDrawer>
  );
};
