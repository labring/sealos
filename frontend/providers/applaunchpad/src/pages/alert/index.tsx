import React, { useEffect, useState } from 'react';
import { getAppAlertInfo } from '@/api/app';
import MyIcon from '@/components/Icon';
import {
  Box,
  Button,
  Center,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';

const AlertManagement = () => {
  const [alertDataList, setAlertDataList] = useState([]);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const columns = [
    { title: '命名空间', field: 'namespace' },
    { title: '应用名称', field: 'appName' },
    { title: '容器名称', field: 'podName' },
    { title: '告警状态', field: 'alertStatus' },
    { title: '告警信息', field: 'alertMessage' },
    { title: '操作' },
  ];

  useEffect(() => {
    fetchAlertData();
  }, []);

  const fetchAlertData = async () => {
    const resp = await getAppAlertInfo(); // Replace with actual API for fetching alert data
    if (resp) {
      setAlertDataList(resp);
    }
  };

  const router = useRouter();
  
  const onViewDetails = (alert: any) => {
    const { namespace, appName } = alert;
    // navigate(`/app/detail?namespace=${namespace}&&name=${appName}`);
    router.push(`/app/detail?namespace=${namespace}&&name=${appName}`);
  };

  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'} justifyContent={'space-between'}>
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
            告警信息管理
          </Box>
        </Flex>
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
            {alertDataList.map((row, rowIndex) => (
              <Tr key={rowIndex}>
                {columns.map((column, colIndex) =>
                  column.title === '操作' ? (
                    <Td key={`${rowIndex}-${colIndex}`}>
                      <Button size="sm" onClick={() => onViewDetails(row)}>
                        查看详情
                      </Button>
                    </Td>
                  ) : (
                    <Td
                      key={`${rowIndex}-${colIndex}`}
                      style={
                        column.title === '告警信息'
                          ? { 
                              maxWidth: '200px', // 限制宽度
                              whiteSpace: 'pre-wrap', // 保留换行符并自动换行
                              wordBreak: 'break-word', // 长单词自动换行
                            }
                          : {}
                      }
                    >
                      {row[column.field as keyof typeof row]}
                    </Td>
                  )
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>告警详情</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <p>命名空间: {currentAlert?.namespace}</p>
            <p>容器名称: {currentAlert?.podName}</p>
            <p>应用名称: {currentAlert?.appName}</p>
            <p>告警状态: {currentAlert?.alertStatus}</p>
            <p>告警信息: {currentAlert?.alertMessage}</p>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AlertManagement;