import { CloseOutlined } from '@ant-design/icons';
import { Drawer as AntdDrawer, Button } from 'antd';
interface Props {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}
const Drawer = ({ title, children, open, onClose }: Props) => {
  return (
    <AntdDrawer
      classNames={{ header: 'bg-[#24282C]' }}
      open={open}
      closeIcon={<CloseOutlined style={{ color: 'white', fontSize: '32px' }} />}
      title={<span className="pl-2 text-white font-medium text-base">{title}</span>}
      width="550px"
      onClose={onClose}
      destroyOnClose
    >
      <div className="flex flex-col gap-6">{children}</div>
    </AntdDrawer>
  );
};

export default Drawer;
