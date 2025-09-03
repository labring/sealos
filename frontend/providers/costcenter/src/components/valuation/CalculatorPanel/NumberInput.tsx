import vector from '@/assert/Vector.svg';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { isNumber } from 'lodash';
import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
interface CalculatorNumberInputProps {
  unit?: string;
  value: number;
  onChange?: (str: string, val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export default function CalculatorNumberInput({
  onChange,
  unit,
  value,
  min = 0,
  max,
  disabled = false,
  className,
  ...props
}: CalculatorNumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setInputValue(str);

    let val = 0;
    const numVal = parseFloat(str);
    if (isNumber(numVal) && !isNaN(numVal)) {
      val = Math.max(min, max !== undefined ? Math.min(max, numVal) : numVal);
    }
    onChange?.(str, val);
  };

  const increment = () => {
    const newVal = Math.min(max !== undefined ? max : Number.MAX_SAFE_INTEGER, value + 1);
    const str = newVal.toString();
    setInputValue(str);
    onChange?.(str, newVal);
  };

  const decrement = () => {
    const newVal = Math.max(min, value - 1);
    const str = newVal.toString();
    setInputValue(str);
    onChange?.(str, newVal);
  };

  return (
    <div className={`relative flex items-center w-24 h-8 ${className}`}>
      <Input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        className="h-8 w-full bg-gray-50 border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 pr-8"
        {...props}
      />
      {unit && (
        <span className="absolute right-8 text-gray-500 font-medium text-xs pointer-events-none">
          {unit}
        </span>
      )}
      <div className="absolute right-0 flex flex-col border-l border-gray-200 h-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={increment}
          disabled={disabled || (max !== undefined && value >= max)}
          className="h-4 w-6 p-0 rounded-none border-b border-gray-200 hover:bg-gray-100"
        >
          <ChevronUp className="w-3 h-3 text-gray-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={decrement}
          disabled={disabled || value <= min}
          className="h-4 w-6 p-0 rounded-none hover:bg-gray-100"
        >
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </Button>
      </div>
    </div>
  );
}
