/* eslint-disable @next/next/no-img-element */
import React from 'react';

export default function DeskTopIcon(props: { src: string; className: string; width: number }) {
  const { src, className, width, ...rest } = props;

  return <img src={props.src} alt="" width={width} />;
}
