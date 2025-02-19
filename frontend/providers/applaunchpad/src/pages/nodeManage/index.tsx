import { deleteImageHub, getNodes, getBackupNodes, addNodes, deleteNodes, uploadImageHub, addBackupNodes, deleteBackupNodes } from '@/api/app';
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
  useToast,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from '@chakra-ui/react';
import type { ThemeType } from '@sealos/ui';
import { useMessage } from '@sealos/ui';
import axios from 'axios';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const toast = useToast()
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
    { title: 'ip', field: 'internalIP' },
    { title: '主机名', field: 'name' },
    { title: '节点类型', field: 'roles' },
    { title: '状态', field: 'status' },
    { title: '版本', field: 'version' },
    { title: '操作', field: 'operate' }
  ];
  const backupColumns = [
    { title: 'ip', field: 'internalIP' },
    { title: '操作', field: 'operate' }
  ]

  const [data, setData] = useState([])
  const [nodeModel, setNodeModel] = useState({
    ip: '',
    roles: 'master',
    pwd: ''
  })
  const [currentDeleteNode, setCurrentDeleteNode] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [backupData, setBackupData] = useState([])
  const [backupNodeModel, setBackupNodeModel] = useState({
    ip: ''
  })

  useEffect(() => {
    initNodeData()
  }, [])

  const { isOpen, onOpen, onClose } = useDisclosure();

  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();

  const { isOpen: isCreateBackupOpen, onOpen: onCreateBackupOpen, onClose: onCreateBackupClose } = useDisclosure();

  const [isDeleteBackupOpen, setIsDeleteBackupOpen] = useState(false)

  const initNodeData = async () => {
    const resp: any = await getNodes()
    if (resp) {
      setData(resp)
    }
  }

  const createNodeModelClose = () => {
    setNodeModel({
      ip: '',
      roles: 'master',
      pwd: ''
    })
    onClose()
  }

  const createNodeModelConfirm = async() => {
    setCreateLoading(true)
    try {
      const resp = await addNodes({
        node_ip: nodeModel.ip,
        passwd: nodeModel.pwd
      })
      setCreateLoading(false)
      toast({
        status: 'success',
        title: '创建成功'
      })
      createNodeModelClose()
      initNodeData()
    } catch (error: any) {
      setCreateLoading(false)
      toast({
        status: 'error',
        title: error.message
      });
    }
  }

  const deleteNodeModel = (data: any) => {
    console.log('deleteNodeModel>>>', data)
    if (data.roles === 'master') {
      toast({
        title: '主节点不可删除',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      return
    }
    setCurrentDeleteNode(data)
    setIsDeleteOpen(true)
  }

  const onDeleteClose = () => {
    setCurrentDeleteNode(null)
    setIsDeleteOpen(false)
  }

  const onDeleteConfirm = async() => {
    setDeleteLoading(true)
    try {
      const resp = await deleteNodes({
        node_ip: currentDeleteNode.internalIP
      })
      setDeleteLoading(false)
      toast({
        status:'success',
        title: '删除成功'
      })
      onDeleteClose()
      initNodeData()
    } catch (error: any) {
      setDeleteLoading(false)
      toast({
        status: 'error',
        title: error.message
      });
    }
  }

  const addBackupNode = () => {
    onCreateBackupOpen()
  }

  const initBackupData = async() => {
    const resp: any = await getBackupNodes()
    if (resp) {
      setBackupData(resp)
    }
  }

  const openBackupDrawer = () => {
    initBackupData()
    onBackupOpen()
  }

  const createBackupNodeModelClose = () => {
    setBackupNodeModel({
      ip: ''
    })
    onCreateBackupClose()
  }

  const createBackupNodeModelConfirm = async() => {
    setCreateLoading(true)
    try {
      const resp = await addBackupNodes({
        node_ip: backupNodeModel.ip
      })
      setCreateLoading(false)
      toast({
        status:'success',
        title: '创建成功'
      })
      createBackupNodeModelClose()
      initBackupData()
    } catch (error: any) {
      setCreateLoading(false)
      toast({
        status: 'error',
        title: error.message
      });
    }
  }

  const deleteBackupNodeModel = (data: any) => {
    console.log('deleteBackupNodeModel>>>', data)
    setCurrentDeleteNode(data)
    setIsDeleteBackupOpen(true)
  }

  const onDeleteBackupClose = () => {
    setCurrentDeleteNode(null)
    setIsDeleteBackupOpen(false)
  }

  const onDeleteBackupConfirm = async() => {
    setDeleteLoading(true)
    try {
      const resp = await deleteBackupNodes({
        node_ip: currentDeleteNode.internalIP
      })
      setDeleteLoading(false)
      toast({
        status:'success',
        title: '删除成功'
      })
      onDeleteBackupClose()
      initBackupData()
    } catch (error: any) {
      setDeleteLoading(false)
      toast({
        status: 'error',
        title: error.message
      });
    }
  }

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
          <Button onClick={openBackupDrawer} marginLeft={2}>备用节点</Button>
        </Flex>
        <Button onClick={onOpen}>添加节点</Button>
      </Flex>


      <Modal isOpen={isOpen} onClose={createNodeModelClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新增节点</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"ip"}</Label>
                <Input
                  type='ip'
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.ip}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      ip: e.target.value
                    })
                  }}
                />
              </Flex>
              <Flex alignItems={'center'}>
                <Label>{"节点类型"}</Label>
                <Select
                  width={'60%'}
                  autoFocus={true}
                  style={{borderColor: '#02A7F0'}}
                  value={nodeModel.roles}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      roles: e.target.value
                    })
                  }}
                >
                  <option value="master">主节点</option>
                  <option value="worker">工作节点</option>
                </Select>
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"密码"}</Label>
                <Input
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.pwd}
                  onChange={e => {
                    setNodeModel({
                     ...nodeModel,
                      pwd: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={createNodeModelConfirm} isLoading={createLoading}>
              确认
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
                    {column.field === 'roles' ? `${row[column.field] === 'worker' ? '工作节点' : '主节点'}` :
                      column.field === 'status' ? `${row[column.field] === 'True' ? '正常' : '异常'}` :
                        column.field === 'operate' ? <Button bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" onClick={() => { deleteNodeModel(row) }}>删除</Button> : row[column.field]}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>删除节点</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <p>确定删除吗？</p>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onDeleteConfirm} isLoading={deleteLoading}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Drawer
        isOpen={isBackupOpen}
        placement='right'
        onClose={onBackupClose}
        size={'md'}
        // finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>备用节点</DrawerHeader>

          <DrawerBody>
            <Button colorScheme='blue' mr={3} onClick={addBackupNode}>
              添加节点
            </Button>

            <TableContainer mt={10}>
              <Table variant="simple" backgroundColor={'white'} color={'black'}>
                <Thead>
                  <Tr>
                    {backupColumns.map((column, index) => (
                      <Th key={index}>{column.title}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {backupData.map((row, rowIndex) => (
                    <Tr key={rowIndex}>
                      {backupColumns.map((column, colIndex) => (
                        <Td key={`${rowIndex}-${colIndex}`}>
                          {column.field === 'operate' ? <Button bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" onClick={() => { deleteBackupNodeModel(row) }}>删除</Button> : row[column.field]}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </DrawerBody>

          <DrawerFooter>
            <Button variant='outline' mr={3} onClick={onBackupClose}>
              关闭
            </Button>
            {/* <Button colorScheme='blue'>Save</Button> */}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={isCreateBackupOpen} onClose={createBackupNodeModelClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新增节点</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"ip"}</Label>
                <Input
                  type='ip'
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={backupNodeModel.ip}
                  onChange={e => {
                    setBackupNodeModel({
                      ...backupNodeModel,
                      ip: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={createBackupNodeModelConfirm} isLoading={createLoading}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteBackupOpen} onClose={onDeleteBackupClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>删除节点</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <p>确定删除吗？</p>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onDeleteBackupConfirm}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default React.memo(AppList);
