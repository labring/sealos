interface DrawerItemProps {
  name: React.ReactNode;
  value?: React.ReactNode;
  hidden?: boolean;
  padding?: boolean;
  className?: string;
  vertical?: boolean;
}

export const DrawerItem = ({
  name,
  value,
  hidden = false,
  padding = true,
  className = '',
  vertical = false
}: DrawerItemProps) => {
  if (hidden) return null;

  if (vertical) {
    return (
      <div
        className={`flex flex-col ${padding ? 'py-2' : ''} border-b border-[#E8E8E8] last:border-b-0 ${className}`}
      >
        <span className="text-[#8C8C8C] font-medium text-sm mb-2">{name}</span>
        <div className="text-[#262626] text-xs break-all">{value}</div>
      </div>
    );
  }

  return (
    <div
      className={`grid ${
        padding ? 'py-2' : ''
      } border-b border-[#E8E8E8] last:border-b-0 items-start ${className}`}
      style={{ gridTemplateColumns: '100px minmax(0, 1fr)', gap: '16px' }}
    >
      <span className="text-[#8C8C8C] font-medium text-sm">{name}</span>
      <div className="text-[#262626] text-xs break-all">{value}</div>
    </div>
  );
};
