import MyIcon from "@/components/Icon";
import { Table, Thead, Tr, Th, Td, Tbody, Button, TableContainer, Flex, Box, ModalBody, ModalFooter, FormControl, InputGroup, Center, ButtonGroup, ModalCloseButton, Modal, ModalContent, Input, ModalOverlay, ModalHeader, InputRightAddon } from "@chakra-ui/react";
import { getRoles, getAllMenus } from '@/api/roles'
import { DefineCheckBox } from './Checkbox'
import { useEffect, useState } from "react";
const Title = "角色管理"

type RoleItem = {
    name: string;
    description: string;
    updated_at: string;
}

const Label = ({
    children,
    w = 200,
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

const Menu = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState('')
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [currentData, setCurrentData] = useState<any>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [list, setList] = useState<RoleItem[]>([])
    const [menus, setMenus] = useState<any[]>([])
    const [selectedMenu, setSelectedMenu] = useState<any[]>([])
    const getList = async () => {
        const list: RoleItem[] = await getRoles({})
        setList(list)
    }
    const init = async () => {
        const res = await getAllMenus({})
        setMenus(res)
    }
    const onClose = () => {
        setIsOpen(false)
    }
    const onConfirm = async () => {
        try {
            // const resp = await createNamespace({
            //     ns: username
            // })
            // if (resp) {
            //     await syncConfigMap()
            //     toast({
            //         status: 'success',
            //         title: '创建成功'
            //     })
            //     onClose()
            //     initUserDataAndResource()
            // }
        } catch (error: any) {
            // return toast({
            //     status: 'error',
            //     title: error.message
            // });
        }
    }

    const onEdit = async (data: any) => {
        setCurrentData({
            namespace: data.namespace,
            username: data.username,
            services: Number(data.services),
            requestsStorage: Number(data.storage.split('Gi')[0]),
            persistentVolumeClaims: Number(data.persistentvolumeclaims),
            limitsCpu: Number(data.cpu),
            limitsMemory: Number(data.memory.split('Gi')[0]),
        })
        setIsEditOpen(true)
    }

    const onDelete = async (data: any) => {
        setCurrentData(data)
        setIsDeleteOpen(true)
    }

    const onDeleteClose = () => {
        setCurrentData(null)
        setIsDeleteOpen(false)
    }

    const onDeleteConfirm = async () => {
        try {
            if (currentData) {
                // const resp = await deleteResourceQuotas(currentData.namespace)
                // if (resp) {
                //     toast({
                //         status: 'success',
                //         title: '删除成功'
                //     })
                //     onDeleteClose()
                //     initUserDataAndResource()
                // }
            }
        } catch (error) {
        }
    }

    const onEditClose = () => {
        setCurrentData(null)
        setIsEditOpen(false)
    }

    const onOpen = () => {
        setIsOpen(true)
    }

    const onEditConfirm = async () => {
        try {
            if (currentData) {
                // const resp = await updateResourceQuotas(currentData.namespace, {
                //     namespace: currentData.namespace,
                //     username: currentData.username,
                //     limits: {
                //         services: currentData.services,
                //         requestsStorage: `${currentData.requestsStorage}Gi`,
                //         persistentVolumeClaims: currentData.persistentVolumeClaims,
                //         limitsCpu: `${currentData.limitsCpu}`,
                //         limitsMemory: `${currentData.limitsMemory}Gi`
                //     }
                // })
                // if (resp) {
                //     toast({
                //         status: 'success',
                //         title: '编辑成功'
                //     })
                //     onEditClose()
                //     initUserDataAndResource()
                // }
            }
        } catch (error) {
        }
    }
    useEffect(() => {
        getList()
        init()
    }, [])
    return <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
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
                <Button onClick={onOpen}>添加角色</Button>
            </Flex>
        </Flex>
        <TableContainer>
            <Table variant="simple" backgroundColor={'white'} color={'black'}>
                <Thead>
                    <Tr>
                        <Th>
                            角色名称
                        </Th>
                        <Th>
                            角色描述
                        </Th>
                        <Th>
                            更新时间
                        </Th>
                        <Th>
                            操作
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {list.map((item) => {
                        return <Tr key={item.name}>
                            <Td>
                                {item.name}
                            </Td>
                            <Td>
                                {item.description}
                            </Td>
                            <Td>
                                {item.updated_at}
                            </Td>
                            <Td>
                                <ButtonGroup>
                                    <Button size='sm' type="button">编辑</Button>
                                    <Button bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" type="button">删除</Button>
                                </ButtonGroup>
                            </Td>
                        </Tr>
                    })}
                </Tbody>
            </Table>
        </TableContainer>
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>新增角色</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl mb={7} w={'100%'}>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>角色名称</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                width={'60%'}
                                autoFocus={true}
                                maxLength={60}
                            />
                        </Flex>
                    </FormControl>
                    {/* <FormControl mb={7} w={'100%'}>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>菜单管理</Label>
                            
                        </Flex>
                    </FormControl> */}
                    <Flex alignItems={'center'} mb={5}>
                        <Label>菜单管理</Label>
                        <DefineCheckBox onChange={(v: any) => {
                            setSelectedMenu(v)
                        }} value={selectedMenu} list={menus} />
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onConfirm}>
                        确认
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>

        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>删除角色</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <p>确定删除吗？</p>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onDeleteConfirm}>
                        确认
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>

        <Modal isOpen={isEditOpen} onClose={onEditClose} size={'4xl'} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>编辑角色</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl mb={7} w={'100%'}>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>用户名</Label>
                            <Input
                                type='text'
                                value={currentData?.username}
                                onChange={(e) => {
                                    setCurrentData({
                                        ...currentData,
                                        username: e.target.value
                                    })
                                }}
                                autoFocus={true}
                                maxLength={60}
                            />
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>命名空间</Label>
                            <Input
                                value={currentData?.namespace}
                                autoFocus={true}
                                maxLength={60}
                                disabled={true}
                            />
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>网络服务数量</Label>
                            <Input
                                type='number'
                                value={currentData?.services}
                                onChange={(e) => {
                                    setCurrentData({
                                        ...currentData,
                                        services: Number(e.target.value)
                                    })
                                }}
                                autoFocus={true}
                                maxLength={60}
                            />
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>请求存储</Label>
                            <InputGroup>
                                <Input
                                    type='number'
                                    value={currentData?.requestsStorage}
                                    onChange={(e) => {
                                        setCurrentData({
                                            ...currentData,
                                            requestsStorage: Number(e.target.value)
                                        })
                                    }}
                                    autoFocus={true}
                                    maxLength={60}
                                />
                                <InputRightAddon style={{ height: 32, borderColor: '#02A7F0' }}>Gi</InputRightAddon>
                            </InputGroup>
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>磁盘数量</Label>
                            <Input
                                type='number'
                                value={currentData?.persistentVolumeClaims}
                                onChange={(e) => {
                                    setCurrentData({
                                        ...currentData,
                                        persistentVolumeClaims: Number(e.target.value)
                                    })
                                }}
                                autoFocus={true}
                                maxLength={60}
                            />
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>CPU 限制</Label>
                            <Input
                                type='number'
                                value={currentData?.limitsCpu}
                                onChange={(e) => {
                                    setCurrentData({
                                        ...currentData,
                                        limitsCpu: Number(e.target.value)
                                    })
                                }}
                                autoFocus={true}
                                maxLength={60}
                            />
                        </Flex>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>内存限制</Label>
                            <InputGroup>
                                <Input
                                    type='number'
                                    value={currentData?.limitsMemory}
                                    onChange={(e) => {
                                        setCurrentData({
                                            ...currentData,
                                            limitsMemory: Number(e.target.value)
                                        })
                                    }}
                                    autoFocus={true}
                                    maxLength={60}
                                />
                                <InputRightAddon style={{ height: 32, borderColor: '#02A7F0' }}>Gi</InputRightAddon>
                            </InputGroup>
                        </Flex>
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onEditConfirm}>
                        确认
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    </Box>
}

export default Menu;