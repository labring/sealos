import { Tag, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

export const ResponsiveKeyList = ({ keys }: { keys: string[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerWidth === 0) return;
    let currentWidth = 0;
    let count = 0;
    const GAP = 4;
    const OVERFLOW_TAG_WIDTH = 45; // Width for +99 tag
    const TAG_PADDING = 16;
    const CHAR_WIDTH = 7.5; // Approx width for standard font

    for (let i = 0; i < keys.length; i++) {
      const keyWidth = keys[i].length * CHAR_WIDTH + TAG_PADDING;

      // If this is the last item and it fits, good.
      // If not last, we need to check if it fits ALONG with the overflow tag space
      if (i === keys.length - 1) {
        if (currentWidth + keyWidth <= containerWidth) {
          count++;
        }
      } else {
        // Check if adding this key + potential overflow tag fits
        if (currentWidth + keyWidth + GAP + OVERFLOW_TAG_WIDTH <= containerWidth) {
          currentWidth += keyWidth + GAP;
          count++;
        } else {
          break;
        }
      }
    }
    // Always show at least 1 if possible, or 0 if width is tiny
    setVisibleCount(Math.max(1, count));
  }, [containerWidth, keys]);

  if (keys.length === 0) return <>-</>;

  const visibleKeys = keys.slice(0, visibleCount);
  const hiddenKeys = keys.slice(visibleCount);

  return (
    <div ref={containerRef} className="w-full flex flex-wrap gap-1 overflow-hidden h-[24px]">
      {visibleKeys.map((key) => (
        <Tag key={key} className="mr-0" bordered={false}>
          {key}
        </Tag>
      ))}
      {hiddenKeys.length > 0 && (
        <Tooltip
          title={
            <div className="flex flex-col gap-1">
              {hiddenKeys.map((key) => (
                <span key={key}>{key}</span>
              ))}
            </div>
          }
        >
          <Tag className="cursor-pointer mr-0" bordered={false}>
            +{hiddenKeys.length}
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};
