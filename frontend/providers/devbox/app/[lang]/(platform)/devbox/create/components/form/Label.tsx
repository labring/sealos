import { Box, BoxProps } from '@chakra-ui/react';

const Label = ({
  children,
  w = 'auto',
  ...props
}: {
  children: string;
  w?: number | 'auto';
} & BoxProps) => (
  <Box
    flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
    color={'grayModern.900'}
    fontWeight={'bold'}
    userSelect={'none'}
    {...props}
  >
    {children}
  </Box>
);
export default Label;
