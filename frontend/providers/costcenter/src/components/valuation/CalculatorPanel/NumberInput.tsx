import vector from '@/assert/Vector.svg';
import {
  Img,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputProps,
  NumberInputStepper,
  Text
} from '@chakra-ui/react';
import { isNumber } from 'lodash';
export default function CalculatorNumberInput({
  onChange,
  unit,
  ...props
}: { unit?: string } & NumberInputProps) {
  return (
    <NumberInput
      clampValueOnBlur={false}
      step={1}
      min={0}
      w="104px"
      h="32px"
      boxSizing="border-box"
      background="grayModern.50"
      px={'12px'}
      py={'8px'}
      border="1px solid"
      borderColor={'grayModern.200'}
      borderRadius="6px"
      alignItems="center"
      display={'flex'}
      variant={'unstyled'}
      onChange={(str, v) => {
        let val = 0;
        console.log(str, v);
        if (isNumber(v) && !isNaN(v)) val = v;
        onChange?.(str, val);
      }}
      _hover={{
        borderColor: 'brightBlue.300'
      }}
      _focusWithin={{
        borderColor: 'brightBlue.500',
        boxShadow: '0px 0px 0px 2.4px #3370FF26;',
        bgColor: 'white'
      }}
      {...props}
    >
      <NumberInputField
        color={'grayModern.900'}
        borderRadius={'none'}
        fontSize={'12px'}
        max={props.max}
        min={props.min}
      />
      {unit && (
        <Text
          right={'33px'}
          position={'absolute'}
          insetY={'auto'}
          color={'grayModern.500'}
          fontWeight={'500'}
          fontSize={'12px'}
        >
          {unit}
        </Text>
      )}
      <NumberInputStepper borderColor={'grayModern.200'}>
        <NumberIncrementStepper
          width={'24px'}
          borderColor={'grayModern.200'}
          h={'16px'}
          color={'grayModern.500'}
          _disabled={{
            cursor: 'not-allowed',
            borderColor: 'grayModern.200'
          }}
        >
          <Img src={vector.src}></Img>
        </NumberIncrementStepper>
        <NumberDecrementStepper
          w="24px"
          borderColor={'grayModern.200'}
          h={'16px'}
          color={'grayModern.500'}
          _disabled={{
            borderColor: 'grayModern.200',
            cursor: 'not-allowed'
          }}
        >
          <Img src={vector.src} transform={'rotate(180deg)'}></Img>
        </NumberDecrementStepper>
      </NumberInputStepper>
    </NumberInput>
  );
}
