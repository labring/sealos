import React, { useMemo } from 'react';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Box
} from '@chakra-ui/react';

export const MySlider = ({
  markList,
  setVal,
  activeVal,
  max = 100,
  min = 0,
  step = 1
}: {
  markList: {
    label: string | number;
    value: number;
  }[];
  activeVal?: number;
  setVal: (index: number) => void;
  max?: number;
  min?: number;
  step?: number;
}) => {
  const value = useMemo(() => {
    const index = markList.findIndex((item) => item.value === activeVal);
    return index > -1 ? index : 0;
  }, [activeVal, markList]);

  return (
    <Slider max={max} min={min} step={step} size={'lg'} value={value} onChange={setVal}>
      {markList.map((item, i) => (
        <SliderMark
          key={item.value}
          value={i}
          mt={3}
          fontSize={'11px'}
          transform={'translateX(-50%)'}
          whiteSpace={'nowrap'}
          {...(activeVal === item.value
            ? { color: 'myGray.900', fontWeight: 'bold' }
            : { color: 'grayModern.900' })}
        >
          <Box px={3} cursor={'pointer'}>
            {item.label}
          </Box>
        </SliderMark>
      ))}
      <SliderTrack bg={'#EAEDF3'} borderRadius={'4px'} overflow={'hidden'} h={'4px'}>
        <SliderFilledTrack bg={'grayModern.900'} />
      </SliderTrack>
      <SliderThumb bg={'grayModern.900'}></SliderThumb>
    </Slider>
  );
};
