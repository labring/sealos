import { useBreakpointValue, Center } from '@chakra-ui/react';

export function ChakraIndicator() {
  const breakpoint = useBreakpointValue({
    base: 'base 0',
    xs: 'xs 375',
    sm: 'sm 640',
    md: 'md 768',
    lg: 'lg 1024',
    xl: 'xl 1280',
    '2xl': '2xl 1440'
  });

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Center
      height={'24px'}
      position="fixed"
      bottom="1"
      left="1"
      zIndex={50}
      borderRadius="full"
      bg="white"
      fontSize="md"
      fontWeight={'bold'}
      color="grayModern.900"
    >
      {breakpoint}
    </Center>
  );
}
