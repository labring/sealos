import { Flex, Input } from '@chakra-ui/react';
export default function CustomInput(props: Parameters<typeof Input>[0]) {
  return (
    <Flex
      w="100%"
      borderRadius="2px"
      border="1px solid #DEE0E2"
      bg="#FBFBFC"
      align={'center'}
      py={'11px'}
      pl={'12px'}
    >
      <Input {...props} h="20px" fontSize={'14px'} variant={'unstyled'}></Input>
    </Flex>
  );
}
