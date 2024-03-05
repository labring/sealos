import {
  LeftOutlined,
  RightOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined
} from '@ant-design/icons';
import { PaginationProps, Space } from 'antd';
import { useCallback, useMemo, useState } from 'react';

interface SwitchButtonProps {
  onClick?: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}

const SwitchButton = ({ onClick, disabled, icon }: SwitchButtonProps) => {
  const disabledClass = disabled
    ? 'cursor-no-drop text-[#667085]'
    : 'cursor-pointer text-[#111824]';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick?.();
      }}
      className={`w-6 h-6 rounded-full bg-[#F4F4F7] ${disabledClass}`}
    >
      {icon}
    </button>
  );
};

export function usePaginationProps(total: number): PaginationProps {
  const [nxtPage, setNxtPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPageNum = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  const itemRender = useCallback<Required<PaginationProps>['itemRender']>(
    (_, type, originalElement) => {
      let disabled: boolean;
      switch (type) {
        case 'prev':
          disabled = nxtPage === 1; // current is index-0 page
          return (
            <Space>
              <SwitchButton
                icon={<VerticalRightOutlined />}
                onClick={() => setNxtPage(1)}
                disabled={disabled}
              />
              <SwitchButton
                icon={<LeftOutlined />}
                onClick={() => setNxtPage(nxtPage - 1)}
                disabled={disabled}
              />
            </Space>
          );
        case 'next':
          disabled = nxtPage === totalPageNum;
          return (
            <Space>
              <SwitchButton
                icon={<RightOutlined />}
                onClick={() => setNxtPage(nxtPage + 1)}
                disabled={disabled}
              />
              <SwitchButton
                icon={<VerticalLeftOutlined />}
                onClick={() => setNxtPage(totalPageNum)}
                disabled={disabled}
              />
            </Space>
          );
      }
      return originalElement;
    },
    [nxtPage, totalPageNum]
  );

  return {
    showTotal: (total) => <span>{`Total Items: ${total}`}</span>,
    current: nxtPage,
    pageSize,
    size: 'default',
    simple: true,
    hideOnSinglePage: true,
    onChange: (page) => setNxtPage(page),
    onShowSizeChange(_, size) {
      setNxtPage(1);
      setPageSize(size);
    },
    itemRender
  };
}
