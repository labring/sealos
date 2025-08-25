import React from 'react';
import {
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Box
} from '@chakra-ui/react';

export const MyRangeSlider = ({
  value,
  max = 100,
  min = 0,
  step = 1,
  setVal
}: {
  value: [number, number];
  setVal: (index: [number, number]) => void;
  max?: number;
  min?: number;
  step?: number;
}) => {
  const startEndValStyle = {
    position: 'absolute' as const,
    top: '10px'
  };

  return (
    <RangeSlider
      // eslint-disable-next-line jsx-a11y/aria-proptypes
      aria-label={['min', 'max']}
      value={value}
      min={min}
      max={max}
      size={'lg'}
      step={step}
      minStepsBetweenThumbs={1}
      onChange={setVal}
    >
      <RangeSliderTrack overflow={'visible'} h={'4px'}>
        <Box {...startEndValStyle} left={0} transform={'translateX(-50%)'}>
          {min}
        </Box>
        <Box {...startEndValStyle} right={0} transform={'translateX(50%)'}>
          {max}
        </Box>
        <RangeSliderFilledTrack bg={'grayModern.900'} />
      </RangeSliderTrack>
      <RangeSliderThumb index={0} bg={'grayModern.900'}>
        <Box transform={'translateY(18px)'}>{value[0] === min ? '' : value[0]}</Box>
      </RangeSliderThumb>
      <RangeSliderThumb index={1} bg={'grayModern.900'}>
        <Box transform={'translateY(18px)'}>{value[1] === max ? '' : value[1]}</Box>
      </RangeSliderThumb>
    </RangeSlider>
  );
};
