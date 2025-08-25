import React from 'react';
import { Flex, Box } from '@chakra-ui/react';

const ButtonGroup = ({
  list
}: {
  list: {
    label: string;
    onclick: () => void;
    active: boolean;
  }[];
}) => {
  return (
    <Flex borderRadius={'sm'} overflow={'hidden'} fontSize={'sm'}>
      {list.map((item) => (
        <Box
          key={item.label}
          py={1}
          px={6}
          backgroundColor={item.active ? 'brightBlue.600' : 'blackAlpha.50'}
          color={item.active ? 'white' : 'blackAlpha.700'}
          cursor={'pointer'}
          onClick={item.onclick}
          _first={{
            borderTopLeftRadius: 'sm',
            borderBottomLeftRadius: 'sm'
          }}
          _last={{
            borderTopRightRadius: 'sm',
            borderBottomRightRadius: 'sm'
          }}
        >
          {item.label}
        </Box>
      ))}
    </Flex>
  );
};

export default ButtonGroup;
