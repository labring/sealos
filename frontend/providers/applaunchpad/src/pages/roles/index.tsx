import MyIcon from "@/components/Icon";
import { Table, Thead, Tr, Th, Td, Tbody, Button, TableContainer, Flex, Box, ModalBody, ModalFooter, FormControl, InputGroup, Center, ButtonGroup, ModalCloseButton, Modal, ModalContent, Input, ModalOverlay, ModalHeader, InputRightAddon, useToast } from "@chakra-ui/react";
import { getRoles, getAllMenus, addRoles, updateRoles, addRolesAndMenu, deleteRoles, getRolesAndMenu } from '@/api/roles'
import { DefineCheckBox } from '../../components/Checkox'
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
    const [id, setId] = useState<any>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [currentData, setCurrentData] = useState<any>(null)
    const [list, setList] = useState<RoleItem[]>([])
    const [menus, setMenus] = useState<any[]>([])
    const [desc, setDesc] = useState('')
    const toast = useToast();
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
            const res = await addRoles({
                name,
                description: desc,
                status: '1'
            })
            await addRolesAndMenu(res.id, {
                menu_ids: selectedMenu
            })
            toast({
                status: 'success',
                title: '创建成功'
            })
            onClose()
            getList()
        } catch (error: any) {
            return toast({
                status: 'error',
                title: error.message
            });
        }
    }
    const onClear = () => {
        setName('')
        setDesc('')
        setId(null)
    }
    const onEdit = async (data: any) => {
        setName(data.name)
        setDesc(data.description)
        setId(data.id)
        const res = await getRolesAndMenu(data.id)
        setSelectedMenu(res.map((item: any) => item.id))
        setIsOpen(true)
    }
    useEffect(() => {
        if (!isOpen) {
            onClear()
        }
    }, [isOpen])

    const onDelete = async (data: any) => {
        setId(data.id)
        setIsDeleteOpen(true)
    }

    const onDeleteClose = () => {
        setId(null)
        setIsDeleteOpen(false)
    }

    const onDeleteConfirm = async () => {
        try {
            if (id) {
                await deleteRoles(id)
                toast({
                    status: 'success',
                    title: '删除成功'
                })
                onDeleteClose()
                getList()
            }
        } catch (error) {
        }
    }

    const onEditClose = () => {
        setCurrentData(null)
    }

    const onOpen = () => {
        setIsOpen(true)
    }

    const onEditConfirm = async () => {
        try {
            if (id) {
                await updateRoles(id, {
                    name,
                    description: desc,
                    status: '1'
                })
                await addRolesAndMenu(id, {
                    menu_ids: selectedMenu
                })
                toast({
                    status: 'success',
                    title: '编辑成功'
                })
                onClose()
                getList()
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
                                    <Button onClick={() => {
                                        onEdit(item)
                                    }} size='sm' type="button">编辑</Button>
                                    <Button onClick={() => {
                                        onDelete(item)
                                    }} bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" type="button">删除</Button>
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
                <ModalHeader>{id ? '编辑角色' : '新增角色'}</ModalHeader>
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
                    <FormControl mb={7} w={'100%'}>
                        <Flex alignItems={'center'} mb={5}>
                            <Label>描述</Label>
                            <Input
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
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
                    <Button colorScheme="blue" mr={3} onClick={() => {
                        if (id) {
                            onEditConfirm()
                        } else {
                            onConfirm()
                        }
                    }}>
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
    </Box>
}

export default Menu;