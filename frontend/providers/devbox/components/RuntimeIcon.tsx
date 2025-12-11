'use client';

import Image from 'next/image';
import { useState } from 'react';

interface RuntimeIconProps {
  iconId: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export const RuntimeIcon = ({
  iconId,
  alt,
  width = 21,
  height = 21,
  className,
  priority,
  onLoad
}: RuntimeIconProps) => {
  const [imgSrc, setImgSrc] = useState(`/images/runtime/${iconId}.svg`);

  return (
    <Image
      width={width}
      height={height}
      alt={alt}
      src={imgSrc}
      className={className}
      priority={priority}
      onError={() => setImgSrc('/images/runtime/custom.svg')}
      onLoad={onLoad}
    />
  );
};
