import MyIcon from "@/components/Icon";
import { Table, Thead, Tr, Th, Td, Tbody, Button, TableContainer, Flex, Box, Center, ButtonGroup, Modal } from "@chakra-ui/react";

const Title = "菜单管理"

type MenuItem = {
    menuName:string;
    menuCode:string;
}

const Menu = () => {
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
                <Button>添加菜单</Button>
            </Flex>
        </Flex>
        <TableContainer>
            <Table variant="simple" backgroundColor={'white'} color={'black'}>
                <Thead>
                    <Tr>
                        <Th>
                            菜单名称
                        </Th>
                        <Th>
                            菜单编码
                        </Th>
                        <Th>
                            操作
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    <Tr>
                        <Td>
                            菜单1
                        </Td>
                        <Td>
                            bm1
                        </Td>
                        <Td>
                            <ButtonGroup>
                                <Button size='sm' type="button">编辑</Button>
                                <Button bgColor={'red'} colorScheme='red' _hover={{ bgColor: 'red' }} size="sm" type="button">删除</Button>
                            </ButtonGroup>
                        </Td>
                    </Tr>
                </Tbody>
            </Table>
        </TableContainer>
    </Box>
}

const EditModal = ({isOpen,onClose,currentData}:{isOpen:boolean,onClose?:()=>void,currentData?:MenuItem})=>{
    return <Modal children={undefined} isOpen={isOpen} onClose={function (): void {
        throw new Error("Function not implemented.");
    } }>
        
    </Modal>
}

export default Menu;