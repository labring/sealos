interface Props {
  children: React.ReactNode;
}

const DrawerTitle = ({ children }: Props) => {
  return <div className="p-2 bg-gray-600 text-white font-bold text-sm">{children}</div>;
};

export default DrawerTitle;
