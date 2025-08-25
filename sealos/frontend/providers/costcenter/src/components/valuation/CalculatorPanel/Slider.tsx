import {
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderProps,
  SliderThumb,
  SliderTrack
} from '@chakra-ui/react';

export default function CalculatorSlider({
  rangeList,
  value,
  unit,
  ...props
}: { unit: string; rangeList: number[] } & SliderProps) {
  return (
    <Slider w={'400px'} min={0} max={4} step={1} value={value} {...props}>
      {rangeList.map((v, idx) => (
        <>
          <SliderMark
            value={idx}
            key={idx}
            mt={'6px'}
            fontSize={'11px'}
            transform={'translateX(-50%)'}
            color={idx === value ? 'grayModern.900' : 'grayModern.400'}
          >
            {v}
            {idx === rangeList.length - 1 && unit}
          </SliderMark>
        </>
      ))}
      <SliderTrack>
        <SliderFilledTrack bgColor={'grayModern.900'} />
      </SliderTrack>
      <SliderThumb bgColor={'grayModern.900'} boxShadow="0px 2px 3px 1px #ABBDCE66" />
    </Slider>
  );
}
