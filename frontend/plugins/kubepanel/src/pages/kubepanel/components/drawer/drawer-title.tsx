interface Props {
  children: React.ReactNode;
}

const DrawerTitle = ({ children }: Props) => {
  return <div className="p-3 bg-gray-600 text-white font-medium text-base">{children}</div>;
};

export default DrawerTitle;
