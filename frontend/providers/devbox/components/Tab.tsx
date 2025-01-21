import React from 'react';
import { Box, useTab } from '@chakra-ui/react';

const Tab = React.forwardRef((props: { children: React.ReactNode }, ref) => {
  const tabProps = useTab({ ...props, ref: ref as React.Ref<HTMLElement> });

  return (
    <Box
      {...tabProps}
      color={'grayModern.500'}
      bg={'white'}
      cursor={'pointer'}
      _hover={{
        color: 'brightBlue.600'
      }}
      mr={6}
      pb={1}
      fontWeight={500}
      fontSize={'14px'}
      _selected={{
        color: 'brightBlue.600',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-2px',
          left: '0px',
          width: '100%',
          height: '2px',
          backgroundColor: 'brightBlue.600'
        }
      }}
    >
      {tabProps.children}
    </Box>
  );
});

Tab.displayName = 'Tab';

export default Tab;
