/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface Props {
  src: string
  className: string
  width: number | string
}

export default function DeskTopIcon({
  src, 
  className, 
  width, 
  ...rest
}:Props) {

  return <img className={className} src={src} alt="" width={width} {...rest} />;
}
