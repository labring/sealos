interface Props {
  children: React.ReactNode;
}

export const DrawerTitle = ({ children }: Props) => {
  return (
    <div className="py-2.5 pl-4 bg-[#F4F6F8] text-[#24282C] font-medium text-base">{children}</div>
  );
};
