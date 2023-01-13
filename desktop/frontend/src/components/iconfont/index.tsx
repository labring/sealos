type TIconfont = {
  iconName: string;
  color?: string;
};

function Iconfont(props: TIconfont) {
  const { iconName, color } = props;
  const style = {
    fill: color
  };

  return (
    <svg className="icon" aria-hidden="true" style={style}>
      <use xlinkHref={`#${iconName}`}></use>
    </svg>
  );
}

export default Iconfont;
