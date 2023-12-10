type TIconfont = {
  iconName: string;
  color?: string;
  width?: number;
  height?: number;
};

function Iconfont(props: TIconfont) {
  const { iconName, color, width, height } = props;
  const style = {
    fill: color,
    width,
    height
  };

  return (
    <svg className="icon" aria-hidden="true" style={style}>
      <use xlinkHref={`#${iconName}`}></use>
    </svg>
  );
}

export default Iconfont;
