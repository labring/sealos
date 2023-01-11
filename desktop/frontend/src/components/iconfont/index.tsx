type TIconfont = {
  iconName: string;
  color?: string;
};

function Iconfont(props: TIconfont) {
  const { iconName, color } = props;
  const iconStyle = {
    color: color
  };

  return <i className={`iconfont ${iconName}`} style={iconStyle}></i>;
}

export default Iconfont;
