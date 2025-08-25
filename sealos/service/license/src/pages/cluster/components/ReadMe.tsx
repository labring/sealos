import {
  Box,
  Flex,
  Grid,
  Icon,
  ListItem,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  UnorderedList
} from '@chakra-ui/react';
import 'github-markdown-css/github-markdown-light.css';

export default function ReadMe() {
  const title = ['操作系统', '内核版本', 'CPU', '内存', '存储', 'Master 节点数量', 'Node 节点数量'];
  const value = ['Ubuntu 22.04 LTS', '≥ 5.4', '4C', '8GB', '100GB', '奇数台', '任意'];

  return (
    <Box color={'gray.900'} fontSize={'14px'} fontWeight={400}>
      <Text fontSize={'md'} fontWeight={'bold'}>
        服务器
      </Text>
      <Box mt="12px">
        <Text>以下是一些基本的要求：</Text>
        <UnorderedList>
          <ListItem>每个集群节点应该有不同的主机名。主机名不要带下划线，也不要大写。</ListItem>
          <ListItem>建议使用干净的操作系统来创建集群。不要自己装 Docker！</ListItem>
          <ListItem>支持大多数 Linux 发行版，例如：Ubuntu、CentOS、Rocky linux。</ListItem>
          <ListItem>
            支持 [Docker Hub](https://hub.docker.com/r/labring/kubernetes/tags) 中的所有 Kubernetes
            版本。
          </ListItem>
        </UnorderedList>
      </Box>
      <Flex alignItems={'center'} gap="6px" mt="12px">
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="16px"
          height="16px"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M7.192 2.068C7.522 1.39933 8.476 1.39933 8.806 2.068L10.378 5.25333L13.8933 5.764C14.6313 5.87067 14.926 6.77867 14.392 7.29934L11.848 9.77867L12.4487 13.2787C12.5753 14.0147 11.8033 14.5753 11.1427 14.228L7.99867 12.5747L4.85533 14.228C4.19533 14.5747 3.42333 14.0147 3.54867 13.2793L4.14933 9.77867L1.606 7.29867C1.072 6.77867 1.36667 5.87134 2.10467 5.764L5.62 5.25333L7.192 2.068Z"
            fill="#219BF4"
          />
        </Icon>
        <Text>推荐配置</Text>
      </Flex>
      <TableContainer
        mt={'12px'}
        borderRadius={'8px'}
        border={'1px solid #E8EBF0'}
        fontSize={'12px'}
        fontWeight={400}
      >
        <Table variant="unstyled">
          <Thead bg="gray.50">
            <Tr>
              {title.map((item, index) => (
                <Th key={item} fontSize={'12px'} fontWeight={400}>
                  {item}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              {value.map((item, index) => (
                <Th key={item} fontSize={'12px'} fontWeight={400}>
                  {item}
                </Th>
              ))}
            </Tr>
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
