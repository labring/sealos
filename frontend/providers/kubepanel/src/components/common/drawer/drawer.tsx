import { CloseOutlined } from '@ant-design/icons';
import { Drawer as AntdDrawer } from 'antd';
interface Props {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}
export const Drawer = ({ title, children, open, onClose }: Props) => {
  return (
    <AntdDrawer
      styles={{
        header: {
          padding: '12px',
          backgroundColor: '#24282C'
        }
      }}
      open={open}
      closeIcon={<CloseOutlined style={{ color: 'white', fontSize: '24px', padding: '4px' }} />}
      title={<span className="text-white font-medium text-base">{title}</span>}
      width="550px"
      onClose={onClose}
      destroyOnClose
    >
      <div className="flex flex-col gap-6">{children}</div>
    </AntdDrawer>
  );
};
