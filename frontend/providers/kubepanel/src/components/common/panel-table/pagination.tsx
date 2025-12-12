import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';

interface SwitchButtonProps {
  onClick?: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}

const SwitchButton = ({ onClick, disabled, icon }: SwitchButtonProps) => {
  const baseClass =
    'flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200 border border-[#E8E8E8] bg-white';
  const stateClass = disabled
    ? 'cursor-not-allowed text-gray-300 bg-gray-50 border-gray-100' // Disabled: lighter grey, no border
    : 'cursor-pointer text-gray-600 hover:text-[#1890FF] hover:border-[#1890FF] hover:bg-[#E6F7FF]'; // Active: Blue hover

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick?.();
      }}
      disabled={disabled}
      className={`${baseClass} ${stateClass}`}
    >
      {icon}
    </button>
  );
};

export const PanelPagination = ({
  total,
  current,
  pageSize,
  onChange
}: {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number) => void;
}) => {
  const totalPage = Math.ceil(total / pageSize);
  const [inputVal, setInputVal] = useState(current.toString());

  // Sync input with external current page change
  useMemo(() => {
    setInputVal(current.toString());
  }, [current]);

  const handleValuesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setInputVal(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let val = parseInt(inputVal);
      if (isNaN(val) || val < 1) val = 1;
      if (val > totalPage) val = totalPage;
      onChange(val);
      setInputVal(val.toString());
    }
  };

  const handleBlur = () => {
    let val = parseInt(inputVal);
    if (isNaN(val) || val < 1) val = 1;
    if (val > totalPage) val = totalPage;
    // Only trigger change if different (optional, but good for UX)
    if (val !== current) {
      onChange(val);
    }
    setInputVal(val.toString());
  };

  const isFirst = current === 1;
  const isLast = current === totalPage;

  return (
    <div className="flex items-center justify-end w-full py-3 select-none">
      {/* Total Items Text */}
      <span className="text-gray-500 font-medium mr-4">Total Items: {total}</span>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <SwitchButton
          icon={<LeftOutlined />}
          onClick={() => onChange(current - 1)}
          disabled={isFirst}
        />

        {/* Pager Block: Input / Total */}
        <div
          className="flex items-center bg-white border border-[#E8E8E8] rounded-md px-2 h-8"
          style={{ gap: '4px' }}
        >
          <input
            className="w-8 h-full text-center border-none outline-none bg-transparent font-medium text-gray-800 p-0 m-0"
            value={inputVal}
            onChange={handleValuesChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
          <span className="text-gray-400 font-medium">/</span>
          {/* THE REQUESTED DOM STRUCTURE FOR "2" */}
          <span className="text-gray-500 font-medium w-8 text-center">{totalPage}</span>
        </div>

        {/* Next Button */}
        <SwitchButton
          icon={<RightOutlined />}
          onClick={() => onChange(current + 1)}
          disabled={isLast}
        />
      </div>
    </div>
  );
};
