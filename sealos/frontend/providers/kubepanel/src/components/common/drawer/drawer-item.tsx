interface DrawerItemProps {
  name: React.ReactNode;
  value?: React.ReactNode;
  hidden?: boolean;
  padding?: boolean;
}

export const DrawerItem = ({ name, value, hidden = false }: DrawerItemProps) => {
  if (hidden) return null;

  return (
    <div
      className={`grid  last:border-b-0`}
      style={{ gridTemplateColumns: 'minmax(30%, min-content) auto' }}
    >
      <span className="overflow-hidden text-ellipsis text-[#5A646E] font-semibold">{name}</span>
      <span className="max-w-full min-w-0 text-[#24282C]">{value}</span>
    </div>
  );
};
