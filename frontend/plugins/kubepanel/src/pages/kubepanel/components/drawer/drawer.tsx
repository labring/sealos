import { Drawer as AntdDrawer } from 'antd';
interface Props {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}
const Drawer = ({ title, children, open, onClose }: Props) => {
  return (
    <AntdDrawer
      classNames={{ body: 'bg-gray-300', header: 'bg-zinc-600' }}
      styles={{ body: { padding: 0 } }}
      open={open}
      title={<span className="text-white">{title}</span>}
      width="60vh"
      onClose={onClose}
    >
      {children}
    </AntdDrawer>
  );
};

export default Drawer;
