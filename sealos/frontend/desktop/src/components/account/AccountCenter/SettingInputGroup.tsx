import { forwardRef, InputGroup, InputGroupProps } from '@chakra-ui/react';

export const SettingInputGroup = forwardRef<InputGroupProps, 'div'>(function SettingInputGroup(
  props,
  ref
) {
  return (
    <InputGroup
      display={'flex'}
      as={'div'}
      flex={1}
      borderRadius="6px"
      border="1px solid "
      borderColor={'grayModern.200'}
      bgColor={'grayModern.50'}
      alignItems={'center'}
      py={'8px'}
      px={'12px'}
      {...props}
      ref={ref}
    />
  );
});
