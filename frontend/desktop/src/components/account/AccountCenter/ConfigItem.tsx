import { StackProps, HStack, Flex, Box, forwardRef } from '@chakra-ui/react';
import { ReactNode } from 'react';

export const ConfigItem = forwardRef<
  StackProps & { LeftElement: ReactNode; RightElement: ReactNode },
  'div'
>(function ConfigItem({ LeftElement, RightElement, ...props }, ref) {
  return (
    <HStack fontSize={'14px'} fontWeight={'500'} {...props}>
      <Box w={'120px'} color={'grayModern.900'}>
        {LeftElement}
      </Box>
      <Flex
        flex={1}
        justifyContent={'space-between'}
        alignItems={'center'}
        color={'grayModern.500'}
        {...props}
      >
        {RightElement}
      </Flex>
    </HStack>
  );
});
