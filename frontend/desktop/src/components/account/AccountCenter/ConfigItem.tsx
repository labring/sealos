import { Flex, Box, forwardRef, FlexProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

export const ConfigItem = forwardRef<
  FlexProps & { LeftElement: ReactNode; RightElement: ReactNode },
  'div'
>(function ConfigItem({ LeftElement, RightElement, ...props }, ref) {
  return (
    <Flex
      fontSize={'14px'}
      fontWeight={'500'}
      flexDirection={{ base: 'column', md: 'row' }}
      {...props}
    >
      <Box w={'120px'} color={'grayModern.900'}>
        {LeftElement}
      </Box>
      <Flex
        flex={1}
        justifyContent={'space-between'}
        alignItems={'center'}
        color={'grayModern.500'}
        width={'100%'}
        {...props}
      >
        {RightElement}
      </Flex>
    </Flex>
  );
});
