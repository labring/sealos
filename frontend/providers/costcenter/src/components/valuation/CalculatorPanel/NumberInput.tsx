import { cn } from '@sealos/shadcn-ui';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { isNumber } from 'lodash';
import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CalculatorNumberInputProps {
  value: number;
  onChange?: (str: string, val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  unit?: string;
}

export default function CalculatorNumberInput({
  onChange,
  value,
  min = 0,
  max,
  disabled = false,
  className,
  unit,
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
    <div className="flex gap-3 items-center">
      <div
        className={cn('relative rounded-md transition-shadow focus-within:outline-none', className)}
      >
        {/* Decrement button on the left */}
        <Button
          type="button"
          variant="ghost"
          onClick={decrement}
          disabled={disabled || value <= min}
          className="absolute left-px top-1/2 -translate-y-1/2 h-[calc(100%-2px)] p-3 disabled:cursor-not-allowed disabled:opacity-20 z-10 border-r rounded-l-[calc(var(--radius-md)-1px)] rounded-r-none"
        >
          <Minus className="w-4 h-4" />
        </Button>

        {/* Input field */}
        <Input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          className="h-9 w-full rounded-md border border-input outline-none bg-transparent px-10 py-1 text-center text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />

        {/* Increment button on the right */}
        <Button
          type="button"
          variant="ghost"
          onClick={increment}
          disabled={disabled || (max !== undefined && value >= max)}
          className="absolute right-px top-1/2 -translate-y-1/2 h-[calc(100%-2px)] p-3 disabled:cursor-not-allowed disabled:opacity-20 z-10 border-l rounded-r-[calc(var(--radius-md)-1px)] rounded-l-none"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {unit && <span className=" text-gray-500 text-sm">{unit}</span>}
    </div>
  );
}
