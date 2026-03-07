'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

interface RuntimeIconProps {
  iconId: string | null;
  icon?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

const SVG_PREFIX_RE = /^<svg[\s>]/i;

const getStaticFallback = (iconId?: string | null) =>
  iconId ? `/images/runtime/${iconId}.svg` : '/images/runtime/custom.svg';

const isSvgContent = (value?: string | null) => !!value && SVG_PREFIX_RE.test(value.trim());

const isHttpsUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

const resolveRuntimeIconSrc = (icon?: string | null, iconId?: string | null) => {
  if (icon) {
    const trimmed = icon.trim();
    if (isSvgContent(trimmed)) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
    }
    if (isHttpsUrl(trimmed)) {
      return trimmed;
    }
  }
  return getStaticFallback(iconId);
};

export const RuntimeIcon = ({
  iconId,
  icon,
  alt,
  width = 21,
  height = 21,
  className,
  priority,
  onLoad
}: RuntimeIconProps) => {
  const resolvedSrc = useMemo(() => resolveRuntimeIconSrc(icon, iconId), [icon, iconId]);
  const [imgSrc, setImgSrc] = useState(resolvedSrc);
  const fallbackSrc = getStaticFallback(iconId);
  const isDynamic = isSvgContent(icon) || isHttpsUrl(icon);

  useEffect(() => {
    setImgSrc(resolvedSrc);
  }, [resolvedSrc]);

  const handleError = () => {
    setImgSrc((prev) => (prev !== fallbackSrc ? fallbackSrc : '/images/runtime/custom.svg'));
  };

  if (isDynamic) {
    return (
      <img
        width={width}
        height={height}
        alt={alt}
        src={imgSrc}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onError={handleError}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      width={width}
      height={height}
      alt={alt}
      src={imgSrc}
      className={className}
      priority={priority}
      onError={handleError}
      onLoad={onLoad}
    />
  );
};
