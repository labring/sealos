import { InputProps, Flex, Input, forwardRef, InputGroup, InputGroupProps } from '@chakra-ui/react';

export const SettingInput = forwardRef<InputProps, 'input'>(function SettingInput(
  { children, ...props },
  ref
) {
  return (
    <Input
      _autofill={{
        bgColor: '#FBFBFC'
      }}
      color={'grayModern.500'}
      fontSize={'14px'}
      variant={'unstyled'}
      borderRadius={'unset'}
      {...props}
      ref={ref}
    />
  );
});
