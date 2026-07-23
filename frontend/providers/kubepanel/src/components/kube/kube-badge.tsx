import { useEffect, useRef, useState } from 'react';

interface KubeBadgeProps {
  label: React.ReactNode;
  disabled?: boolean;
  expandable?: boolean;
  color?: { textColor?: string; backgroundColor?: string };
}

export const KubeBadge = ({
  label,
  expandable = true,
  color,
  disabled = false
}: KubeBadgeProps) => {
  const elem = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);

  useEffect(() => {
    const { offsetWidth = 0, scrollWidth = 0 } = elem.current ?? {};

    setIsExpandable(expandable && offsetWidth < scrollWidth);
  }, [expandable]);

  const onClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    e.stopPropagation();
  };

  const { textColor, backgroundColor } = color ?? {};
  const disabledClass = disabled && 'opacity-50 cursor-not-allowed';
  const expandedClass = isExpanded ? 'break-words' : 'truncate';
  const expandableClass = isExpandable && 'cursor-pointer';
  const bgColorClass = backgroundColor ? `bg-${backgroundColor}` : 'bg-[#EFF0F1]';

  return (
    <div
      className={`inline-block py-1 px-1.5 mr-1 mb-1 max-w-full rounded-[4px] ${disabledClass} ${expandableClass} ${expandedClass} ${bgColorClass}`}
      ref={elem}
      onClick={onClick}
    >
      <span
        className={`w-full text-xs font-medium ${textColor ? `text-${textColor}` : 'text-black'} `}
      >
        {label}
      </span>
    </div>
  );
};
