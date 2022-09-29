/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'

import styles from './index.module.scss'

const Index = (props: any) => {
  let src = `/images/icons/${(props.dir ? props.dir + '/' : '') + props.src}.png`;
  if (props.ext != null) {
    src = props.src;
  }
  const clickDispatch = (event: React.MouseEvent<HTMLDivElement>) => {
    var action = {
      type: event.currentTarget.dataset.action,
      payload: event.currentTarget.dataset.payload,
    }
    if (action.type) {
      // dispatch(action)
    }
  }
  if (props.fafa) {
    return (
      <div
        className={`${styles.uicon} prtclk ${props.className || ''}`}
        onClick={props.onClick || (props.click && clickDispatch) || null}
        data-action={props.click}
        data-payload={props.payload}
        data-menu={props.menu}
      >
        <FontAwesomeIcon
          data-flip={props.flip != null}
          data-invert={props.invert != null ? 'true' : 'false'}
          data-rounded={props.rounded != null ? 'true' : 'false'}
          style={{
            width: props.width,
            height: props.height || props.width,
            color: props.color || null,
            margin: props.margin || null,
          }}
          icon={
            props.reg == null ? fas[props.fafa] : far[props.fafa]
          }
        />
      </div>
    )
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
