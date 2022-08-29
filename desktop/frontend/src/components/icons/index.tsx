/* eslint-disable @next/next/no-img-element */
const Index = (props: any) => {
  const clickDispatch = (event: any) => {
    var action = {
      type: event.currentTarget.dataset.action,
      payload: event.currentTarget.dataset.payload
    };

    if (action.type) {
      // dispatch(action);
    }
  };

  let src = `/images/icons/${(props.dir ? props.dir + '/' : '') + props.src}.png`;
  if (props.ext != null) {
    src = props.src;
  }

  return (
    <img
      width={props.width}
      height={props.height}
      onClick={props.click != null ? clickDispatch : null}
      src={src}
      className={props.className}
      alt=""
    />
  );
};

export default Index;
