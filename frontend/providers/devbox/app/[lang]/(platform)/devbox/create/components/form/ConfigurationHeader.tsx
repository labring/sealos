import { Box, BoxProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function ConfigurationHeader({ children }: { children: ReactNode }) {
  const headerStyles: BoxProps = {
    py: 4,
    pl: '42px',
    borderTopRadius: 'lg',
    fontSize: 'xl',
    color: 'grayModern.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'grayModern.50'
  };
  return <Box {...headerStyles}>{children}</Box>;
}
