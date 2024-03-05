import React, { useState } from 'react';
import { HStack, Tooltip, Input, useNumberInput, IconButton } from '@chakra-ui/react';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';

const RangeInput = ({
  w = 200,
  step = 1,
  precision = 0,
  min = -Infinity,
  max = Infinity,
  value,
  setVal,
  hoverText,
  disabled = false
}: {
  w?: number;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  value: number | '';
  setVal: (val: number) => void;
  hoverText?: string;
  disabled?: boolean;
}) => {
  const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } = useNumberInput({
    focusInputOnChange: false,
    step,
    min,
    max,
    precision,
    value,
    onChange(_, val) {
      !disabled && setVal(val);
    }
  });
  const inc = getIncrementButtonProps();
  const dec = getDecrementButtonProps();
  const input = getInputProps();
  const [isFocus, setIsFocus] = useState(false);

  const IconStyle = {
    variant: 'unstyled'
  };

  return (
    <Tooltip label={hoverText} closeOnClick={false}>
      <HStack
        flex={`0 0 ${w}px`}
        w={`${w}px`}
        position={'relative'}
        borderBottom={`2px solid`}
        borderColor={isFocus ? 'myBlue.600' : 'gray.300'}
        onBlurCapture={() => {
          setIsFocus(false);
        }}
        onFocusCapture={() => {
          setIsFocus(true);
        }}
      >
        <IconButton
          icon={<MinusIcon />}
          aria-label="minus"
          color={+input.value <= min ? 'blackAlpha.400' : 'blackAlpha.700'}
          {...dec}
          {...IconStyle}
        />
        <Input
          variant={'unstyled'}
          textAlign={'center'}
          fontSize={'lg'}
          fontWeight={'bold'}
          {...input}
        />
        <IconButton
          icon={<AddIcon />}
          aria-label="add"
          color={+input.value >= max ? 'blackAlpha.400' : 'blackAlpha.700'}
          {...inc}
          {...IconStyle}
        />
      </HStack>
    </Tooltip>
  );
};

export default RangeInput;
