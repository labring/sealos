import React, { useState, useRef, useLayoutEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';

interface TruncateTooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
  contentClassName?: string;
}

const TruncateTooltip = ({
  children,
  content,
  className,
  contentClassName
}: TruncateTooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [content]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div ref={ref} className={className}>
          {children}
        </div>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent
          side="bottom"
          align="center"
          className={contentClassName || 'w-2xl rounded-xl break-all'}
        >
          <p className="text-sm text-zinc-900 font-normal p-2">{content}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

export default TruncateTooltip;
