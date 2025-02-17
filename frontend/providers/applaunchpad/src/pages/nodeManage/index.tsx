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
  Select,
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
  
  const Title = "节点管理"

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
    { title: 'ip', field: 'nickname' },
    { title: '主机名', field: 'email' },
    { title: '节点类型', field: 'phone' },
    { title: '系统', field: 'tokenLink' },
    { title: '内核版本', field: 'details' },
    { title: 'cpu', field: 'details' },
    { title: '内存', field: 'details' },
    { title: '磁盘', field: 'details' },
    { title: '操作', field: 'details' },
  ];
  
  const data: any[] = [
    // 这里添加你的数据
    // 每个对象应该有和columns中field属性对应的键值对
  ];

  const { isOpen, onOpen, onClose } = useDisclosure();


  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'} justifyContent={'space-between'} >
          <Flex alignItems={'center'}>
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
        <Button  onClick={onOpen}>添加节点</Button>
      </Flex>


        <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
            <ModalHeader>新增节点</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
            <FormControl mb={7}  w={'100%'}>
                <Flex alignItems={'center'} mb={5}>
                    <Label>{"ip"}</Label>
                    <Input
                    width={'60%'}
                    autoFocus={true}
                    maxLength={60}
                    />
                </Flex>
                <Flex alignItems={'center'}>
                    <Label>{"节点类型"}</Label>
                    <Select
                        width={'60%'}
                        autoFocus={true}
                    />
                </Flex>
                </FormControl>
                <FormControl mb={7}  w={'100%'}>
                    <Flex alignItems={'center'} mb={5}>
                        <Label>{"密码"}</Label>
                        <Input
                        width={'60%'}
                        autoFocus={true}
                        maxLength={60}
                        />
                    </Flex>
                </FormControl>
            </ModalBody>
            <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
                关闭
            </Button>
            </ModalFooter>
        </ModalContent>
        </Modal>

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
