import { DrawerTitle } from './drawer-title';

interface Props {
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const DrawerPanel = ({ title, children }: Props) => {
  return (
    <div className="flex-1">
      {title && (
        <div className="pb-4 mb-4 border-b border-[#E8E8E8]">
          {typeof title === 'string' ? <DrawerTitle>{title}</DrawerTitle> : title}
        </div>
      )}
      <div className="flex flex-col">{children}</div>
    </div>
  );
};
