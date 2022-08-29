/* eslint-disable @next/next/no-img-element */
const Index = (props: any) => {
  let src = `/images/icons/${(props.dir ? props.dir + '/' : '') + props.src}.png`;
  if (props.ext != null) {
    src = props.src;
  }

  return (
    <img
      width={props.width}
      height={props.height}
      onClick={props.onClick != null ? props.onClick : null}
      src={src}
      className={props.className}
      alt=""
    />
  );
};

export default Index;
