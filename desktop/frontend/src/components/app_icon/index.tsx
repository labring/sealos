/* eslint-disable @next/next/no-img-element */
import React from 'react';

export default function DeskTopIcon(props: {
  src: string;
  onClick: () => void;
  className: string;
  payload: string;
  width: number;
}) {
  const { src, className, width, ...rest } = props;

  return <img src={props.src} alt="" srcSet="" width={width} />;
}
