import { Box } from '@chakra-ui/react';

const Label = ({
  children,
  w = 'auto',
  ...props
}: {
  children: string;
  w?: number | 'auto';
  [key: string]: any;
}) => (
  <Box
    flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
    {...props}
    color={'#333'}
    userSelect={'none'}
    fontSize={'12px'}
  >
    {children}
  </Box>
);

export default Label;
