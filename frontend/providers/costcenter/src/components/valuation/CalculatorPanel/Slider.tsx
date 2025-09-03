import { Slider } from '@sealos/shadcn-ui/slider';
import React from 'react';

interface CalculatorSliderProps {
  unit: string;
  rangeList: number[];
  value: number;
  onChange?: (value: number) => void;
}

export default function CalculatorSlider({
  rangeList,
  value,
  unit,
  onChange,
  ...props
}: CalculatorSliderProps) {
  const marks = rangeList.map((v, idx) => ({
    label: `${v}${idx === rangeList.length - 1 ? unit : ''}`,
    value: idx
  }));

  return (
    <div className="w-96">
      <Slider
        value={[value]}
        onValueChange={(values) => onChange?.(values[0])}
        min={0}
        max={rangeList.length - 1}
        step={1}
        marks={marks}
        className="w-full"
        {...props}
      />
    </div>
  );
}
