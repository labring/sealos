import { useEffect, useRef, useState } from 'react';

interface KubeBadgeProps {
  label: React.ReactNode;
  expandedLabel?: React.ReactNode;
  disabled?: boolean;
  expandable?: boolean;
  color?: { textColor?: string; backgroundColor?: string };
}

export const KubeBadge = ({
  label,
  expandedLabel,
  expandable = true,
  color,
  disabled = false,
  className
}: KubeBadgeProps & { className?: string }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);

  useEffect(() => {
    const checkExpandable = () => {
      if (spanRef.current) {
        const { offsetWidth = 0, scrollWidth = 0 } = spanRef.current;
        setIsExpandable((expandable && offsetWidth < scrollWidth) || !!expandedLabel);
      }
    };

    checkExpandable();
    // 添加延迟检查以确保渲染完成
    const timer = setTimeout(checkExpandable, 100);
    return () => clearTimeout(timer);
  }, [expandable, expandedLabel, label]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    e.stopPropagation();
  };

  const { textColor, backgroundColor } = color ?? {};
  const disabledClass = disabled && 'opacity-50 cursor-not-allowed';
  const expandableClass = isExpandable && 'cursor-pointer';
  const bgColorClass = backgroundColor ? `bg-${backgroundColor}` : 'bg-[#F4F4F5]';

  return (
    <div
      className={`py-1 px-1.5 mr-2 rounded-md ${disabledClass} ${expandableClass} ${bgColorClass} ${className}`}
      onClick={onClick}
    >
      <span
        ref={spanRef}
        className={`block text-xs font-medium ${textColor ? `text-${textColor}` : 'text-black'} ${isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate max-w-125'}`}
      >
        {isExpanded && expandedLabel ? expandedLabel : label}
      </span>
    </div>
  );
};
