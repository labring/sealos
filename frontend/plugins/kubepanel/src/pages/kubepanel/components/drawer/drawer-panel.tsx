import DrawerTitle from './drawer-title';

interface Props {
  title?: React.ReactNode;
  children: React.ReactNode;
}

const DrawerPanel = ({ title, children }: Props) => {
  return (
    <div className="pb-2">
      {title && typeof title === 'string' ? <DrawerTitle>{title}</DrawerTitle> : title}
      <div className="px-7">{children}</div>
    </div>
  );
};

export default DrawerPanel;
