import {
  InputProps,
  Flex,
  Input,
  forwardRef,
  InputGroup,
  InputGroupProps,
  InputRightElement,
  InputRightElementProps
} from '@chakra-ui/react';

export const SettingInputRightElement = forwardRef<InputRightElementProps, 'input'>(
  function SettingInputRightElement({ ...props }, ref) {
    return (
      <InputRightElement
        h="auto"
        width={'auto'}
        right={'12px'}
        insetY={'8px'}
        {...props}
        ref={ref}
      />
    );
  }
);
