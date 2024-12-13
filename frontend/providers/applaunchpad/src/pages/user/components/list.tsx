// List.tsx
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Input,
  useTheme
} from '@chakra-ui/react';
import React, { useMemo, useState } from 'react';
import { debounce } from 'lodash';

interface ListProps {
  quotas: Array<{
    namespace: string;
    name: string;
    cpu: string;
    memory: string;
    storage: string;
    services: string;
    persistentvolumeclaims: string;
  }>;
  refetchQuotas: () => void;
  onSearch: (term: string) => void;
}

const List: React.FC<ListProps> = ({ quotas, refetchQuotas, onSearch }) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        onSearch(value);
      }, 500),
    []
  );

  const columns = useMemo(
    () => [
      { title: '用户名', key: 'namespace' },
      { title: 'CPU', key: 'cpu' },
      { title: 'Memory', key: 'memory' },
      { title: 'Storage', key: 'storage' },
      { title: 'Services', key: 'services' }
    ],
    []
  );

  return (
    <Flex flexDirection={'column'} h={`calc(100% - 48px)`}>
      <Flex h={'88px'} alignItems={'center'}>
        <Center
          w="46px"
          h={'46px'}
          mr={4}
          backgroundColor={'#FEFEFE'}
          border={theme.borders[200]}
          borderRadius={'md'}
        >
          <Box as="span" fontSize="24px" fontWeight="bold">
            Logo
          </Box>
        </Center>
        <Box fontSize={'xl'} color={'gray.900'} fontWeight={'bold'}>
          用户列表
        </Box>
        <Box ml={3} color={'gray.500'}>
          ( {quotas.length} )
        </Box>
        <Box flex={1}></Box>

        <Input
          placeholder="搜索"
          mr={'14px'}
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            debouncedSearch(newValue);
          }}
        />

        <Button
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          onClick={refetchQuotas}
        >
          刷新
        </Button>
      </Flex>

      <Grid
        height={'40px'}
        templateColumns={`repeat(${columns.length},1fr)`}
        overflowX={'auto'}
        borderRadius={'md'}
        mb={2}
        fontSize={'base'}
        color={'gray.600'}
        fontWeight={'bold'}
      >
        {columns.map((item) => (
          <Box
            px={3}
            py={3}
            bg={'white'}
            key={item.key}
            whiteSpace={'nowrap'}
            _first={{
              pl: 7
            }}
          >
            {item.title}
          </Box>
        ))}
      </Grid>

      <Box h={'0'} flex={1} overflowY={'auto'}>
        {quotas.map((quota, index) => (
          <Grid
            templateColumns={`repeat(${columns.length},1fr)`}
            overflowX={'auto'}
            key={index}
            bg={'white'}
            _hover={{
              bg: '#FBFBFC'
            }}
            borderTopRadius={index === 0 ? 'md' : '0px'}
            borderBottomRadius={index === quotas.length - 1 ? 'md' : '0px'}
            borderBottom={'1px solid'}
            borderBottomColor={index !== quotas.length - 1 ? 'gray.150' : 'transparent'}
          >
            {columns.map((col) => (
              <Flex
                key={col.key}
                alignItems={'center'}
                px={3}
                py={4}
                fontSize={'base'}
                fontWeight={'bold'}
                color={'gray.900'}
              >
                {quota[col.key as keyof typeof quota]}
              </Flex>
            ))}
          </Grid>
        ))}
      </Box>
    </Flex>
  );
};

export default List;