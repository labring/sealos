import { DrawerTitle } from './drawer-title';

interface Props {
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const DrawerPanel = ({ title, children }: Props) => {
  return (
    <div className="flex-1">
      <div className="pb-4">
        {title && typeof title === 'string' ? <DrawerTitle>{title}</DrawerTitle> : title}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
};
