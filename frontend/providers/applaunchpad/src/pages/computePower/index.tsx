import {
  getNamespaces, getComputePowerList, getBackupNodes, addNodes, getNodes, deleteNodes, uploadImageHub,
  addBackupNodes, deleteBackupNodes, getMyApps, addStressTesting, deleteResult, startCalcById
} from '@/api/app';
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
  Textarea,
} from '@chakra-ui/react';
import ReactSelect from 'react-select'
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
  const Title = "算力测算"

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
    // { title: 'id', field: 'id' },
    { title: '测算类型', field: 'type' },
    // { title: '命名空间', field: 'namespace' },
    { title: '测算应用', field: 'apps' },
    { title: '压测接口', field: 'interface' },
    { title: 'qps', field: 'qps' },
    { title: '最大延迟(ms)', field: 'max_latency' },
    { title: '测算状态', field: 'status' },
    { title: '测算结果', field: 'result' },
    { title: '最大使用资源', field: 'max_resource' },
    { title: '操作', field: 'operate' }
  ];
  const backupColumns = [
    { title: 'ip', field: 'internalIP' },
    { title: '操作', field: 'operate' }
  ]

  const [data, setData] = useState([])
  const [computer, setCompute] = useState({
    type: "service",
    nameSpace: "",
    app: "",
    api: "",
    port: "",

  })
  const [currentDeleteNode, setCurrentDeleteNode] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [backupData, setBackupData] = useState([])
  const [backupNodeModel, setBackupNodeModel] = useState({
    ip: ''
  })
  const [nodeModel, setNodeModel] = useState<any>({
    namespace: "",
    app_list: "",
    core_api: "",
    port: "",
    qps: "",
    max_latency: "",
    test_data: "",
    stress_type: 'server'
  });
  const [nameSpaceList, setNameSpaceList] = useState([]);
  const [appList, setAppList] = useState<any>([]);
  const [calcLoading, setCalcLoading] = useState<any>('')

  useEffect(() => {
    initComputePowerList();
    initNameSpace();
  }, [])

  const { isOpen, onOpen, onClose } = useDisclosure();

  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();

  const { isOpen: isCreateBackupOpen, onOpen: onCreateBackupOpen, onClose: onCreateBackupClose } = useDisclosure();

  const [isDeleteBackupOpen, setIsDeleteBackupOpen] = useState(false)

  const initNodeData = async () => {

  }

  useEffect(() => {
    initList()
  }, [])

  const initList = async () => {
    const resp: any = await getComputePowerList()
    if (resp) {
      setData(resp)
    }
  }
  const initComputePowerList = async () => {
    // const res = await getComputePowerList();
    // if (res) {

    // }
  }
  const initNameSpace = async () => {
    const res = await getNamespaces();
    if (res) {
      setNameSpaceList(res);
    }
  }

  const createNodeModelClose = () => {
    // setNodeModel({
    //   ip: '',
    //   roles: 'master',
    //   pwd: ''
    // })
    onClose()
  }

  const getAppWithNameSpace = async (nameSpace?:string) => {
    const data = await getMyApps(nameSpace || nodeModel.namespace)
    setAppList(data)
  }

  const createNodeModelConfirm = async () => {
    setCreateLoading(true)
    try {
      let _nodeModel = {...nodeModel,app_list:nodeModel.app_list ? nodeModel.app_list.map((item:any)=>{
        return item.label
      }).join('|') : ''}
      console.log(nodeModel)
      let params = Object.keys(_nodeModel).reduce((prev: any, next: any) => {
        return `${prev}${prev === '' ? '' : '&'}${next}=${_nodeModel[next]}`
      }, '')
      params += `&stress_id=${Date.now()}`
      const resp = await addStressTesting(params)
      setCreateLoading(false)
      toast({
        status: 'success',
        title: '创建成功'
      })
      createNodeModelClose()
      initList()
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
    setCurrentDeleteNode(data)
    setIsDeleteOpen(true)
  }

  const onDeleteClose = () => {
    setCurrentDeleteNode(null)
    setIsDeleteOpen(false)
  }

  const onDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      console.log('pppp', currentDeleteNode)
      const resp = await deleteResult({
        stress_id: currentDeleteNode[0]
      })
      setDeleteLoading(false)
      toast({
        status: 'success',
        title: '删除成功'
      })
      onDeleteClose()
      initList()
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

  const initBackupData = async () => {
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

  const createBackupNodeModelConfirm = async () => {
    setCreateLoading(true)
    try {
      const resp = await addBackupNodes({
        node_ip: backupNodeModel.ip
      })
      setCreateLoading(false)
      toast({
        status: 'success',
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

  const onDeleteBackupConfirm = async () => {
    setDeleteLoading(true)
    try {
      const resp = await deleteBackupNodes({
        node_ip: currentDeleteNode.internalIP
      })
      setDeleteLoading(false)
      toast({
        status: 'success',
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

  const startCalculate = async(data: any) => {
    const resp = await startCalcById(data[0])
    toast({
      status: 'success',
      title: '操作成功'
    });
    setCalcLoading(data[0])
    setTimeout(() => {
      setCalcLoading('')
      initList()
    }, 1000 * 60 * 3)
    
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
        </Flex>
        <Flex gap={2}>
          {/* <Button onClick={openBackupDrawer} marginLeft={2}>备用节点</Button> */}
          <Button onClick={()=>{
            setNodeModel({
              namespace: "",
              app_list: "",
              core_api: "",
              port: "",
              qps: "",
              max_latency: "",
              test_data: "",
              stress_type: 'server'
            })
            onOpen()
          }}>添加测算</Button>
        </Flex>
      </Flex>


      <Modal isOpen={isOpen} onClose={createNodeModelClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent minW={'600px'}>
          <ModalHeader>新增测算</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'}>
                <Label>{"服务类型"}</Label>
                {/* <Select
                  width={'60%'}
                  autoFocus={true}
                  style={{ borderColor: '#02A7F0' }}
                  value={nodeModel.roles}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      roles: e.target.value
                    })
                  }}
                >
                  <option value="master">服务</option>
                  <option value="worker">组合</option>
                </Select> */}
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'}>
                <Label>{"命名空间"}</Label>
                <Select
                  width={'60%'}
                  autoFocus={true}
                  style={{ borderColor: '#02A7F0' }}
                  value={nodeModel.namespace}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      namespace: e.target.value
                    })
                    getAppWithNameSpace(e.target.value);
                  }}
                >
                  {
                    nameSpaceList.map(val => <option value={val} key={val}>{val}</option>)
                  }
                </Select>
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'}>
                <Label>{"类型"}</Label>
                <Select
                  width={'60%'}
                  autoFocus={true}
                  style={{ borderColor: '#02A7F0' }}
                  value={nodeModel.stress_type}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      stress_type: e.target.value
                    })
                  }}
                >
                  <option value={'server'}>服务</option>
                  <option value={'componse'}>组合</option>
                </Select>
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'}>
                <Label>{"应用"}</Label>
                <ReactSelect
                  className='mulSelect w60'
                  value={nodeModel.app_list}
                  isMulti
                  options={appList.map((appInfo:any)=>{
                    return {
                      label:appInfo.name,
                      value:appInfo.name
                    }
                  })}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      app_list: e
                    })
                  }}
                />
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"核心API"}</Label>
                <Input
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.core_api}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      core_api: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"端口"}</Label>
                <Input
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.port}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      port: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"qps"}</Label>
                <Input
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.qps}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      qps: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>

            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"最大延迟"}</Label>
                <Input
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.max_latency}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      max_latency: e.target.value
                    })
                  }}
                />
              </Flex>
            </FormControl>
            <FormControl mb={7} w={'100%'}>
              <Flex alignItems={'center'} mb={5}>
                <Label>{"测试数据"}</Label>
                <Textarea
                  width={'60%'}
                  autoFocus={true}
                  maxLength={60}
                  value={nodeModel.test_data}
                  onChange={e => {
                    setNodeModel({
                      ...nodeModel,
                      test_data: e.target.value
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
                <Th width={100} key={index}>{column.title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row, rowIndex) => (
              <Tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <Td key={`${rowIndex}-${colIndex}`}>
                    {column.field === 'id' ? row[0] :
                      column.field === 'type' ? `${row[1] === 'server' ? '服务' : '组合'}` :
                        column.field === 'apps' ? row[3] :
                          column.field === 'interface' ? row[5] :
                            column.field === 'qps' ? row[7] :
                              column.field === 'max_latency' ? row[8] :
                                column.field === 'status' ? row[12] :
                                  column.field === 'result' ? row[9] :
                                    column.field === 'max_resource' ? row[10] :
                                      column.field === 'operate' ? <>
                                        {
                                          row[12] === 'processing' ?
                                            <Button isLoading={calcLoading === row[0]} style={{marginRight: 4}} size="sm" onClick={() => { startCalculate(row) }}>{calcLoading === row[0] ? '测算中' : '开始'}</Button> : null
                                        }
                                        <Button bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" onClick={() => { deleteNodeModel(row) }}>删除</Button>
                                      </> : row[column.field]}
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
