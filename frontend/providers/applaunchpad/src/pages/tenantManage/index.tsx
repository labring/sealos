import { deleteImageHub, uploadImageHub } from '@/api/app';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { ImageHubItem } from '@/pages/api/imagehub/get';
import { formatPodTime } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  useDisclosure,
  useTheme,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
} from '@chakra-ui/react';
import type { ThemeType } from '@sealos/ui';
import { useMessage } from '@sealos/ui';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';

const AppList = ({
  apps = [],
  namespaces,
  refetchApps,
  onSearch
}: {
  namespaces: string[];
  apps: ImageHubItem[];
  refetchApps: () => void;
  onSearch: (value: string) => void;
}) => {
  
  const Title = "租户管理"

  const Label = ({
    children,
    w = 120,
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
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
  

  const columns = [
    { title: '昵称', field: 'nickname' },
    { title: '邮箱', field: 'email' },
    { title: '电话', field: 'phone' },
    { title: 'TOKEN链接', field: 'tokenLink' },
    { title: '详情', field: 'details' },
  ];
  
  const data = [
    // 这里添加你的数据
    // 每个对象应该有和columns中field属性对应的键值对
  ];


  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'}>
          <Center
            w="46px"
            h={'46px'}
            mr={4}
            backgroundColor={'#FEFEFE'}
            borderRadius={'md'}
          >
            <MyIcon name="logo" w={'24px'} h={'24px'} />
          </Center>
          <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
            {Title}
          </Box>
      </Flex>
      <Flex>
        <FormControl mb={7}  w={'50%'}>
          <Flex alignItems={'center'} mb={5}>
            <Label>{"用户ID"}</Label>
            <Input
              width={'60%'}
              autoFocus={true}
              maxLength={60}
            />
          </Flex>
          <Flex alignItems={'center'}>
            <Label>{"工作空间ID"}</Label>
            <Input
              width={'60%'}
              autoFocus={true}
              maxLength={60}
            />
          </Flex>
        </FormControl>
        <FormControl mb={7}  w={'50%'}>
          <Flex alignItems={'center'} mb={5}>
            <Label>{"电话"}</Label>
            <Input
              width={'60%'}
              autoFocus={true}
              maxLength={60}
            />
          </Flex>
          <Flex alignItems={'center'}>
            <Label>{"工作空间名"}</Label>
            <Input
              width={'60%'}
              autoFocus={true}
              maxLength={60}
            />
          </Flex>
        </FormControl>
      </Flex>

      <TableContainer>
        <Table variant="simple" backgroundColor={'white'} color={'black'}>
          <Thead>
            <Tr>
              {columns.map((column, index) => (
                <Th key={index}>{column.title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row, rowIndex) => (
              <Tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <Td key={`${rowIndex}-${colIndex}`}>
                    {row[column.field]}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default React.memo(AppList);
