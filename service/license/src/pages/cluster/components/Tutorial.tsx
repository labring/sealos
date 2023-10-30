import { findClusterById } from '@/api/cluster';
import { getFileByName } from '@/api/oos';
import CodeBlock from '@/components/CodeBlock';
import { CheckListIcon, DownloadIcon, OfflineIcon, OnlineComputerIcon } from '@/components/Icon';
import { useCopyData } from '@/hooks/useCopyData';
import { ClusterType } from '@/types';
import { downloadFromURL } from '@/utils/downloadFIle';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Center,
  Divider,
  Flex,
  Link,
  Text
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';

export default function Tutorial({
  clusterId,
  ossFileName
}: {
  clusterId: string;
  ossFileName: string;
}) {
  let { fileNameParams, bashParams } = useMemo(() => {
    if (ossFileName) {
      let match = /cloud-(.*?)\.tar/g.exec(ossFileName);
      return {
        fileNameParams: ossFileName?.replace('/cloud/', ''),
        bashParams: match ? `--cloud-version=${match[1]}` : '--cloud-version v5.0.0-beta1'
      };
    } else {
      return {
        fileNameParams: '',
        bashParams: ''
      };
    }
  }, [ossFileName]);
  // console.log(ossFileName, fileNameParams, bashParams);

  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [ossLink, setOssLink] = useState('');
  const { data } = useQuery(
    ['findClusterByIds', clusterId],
    () =>
      findClusterById({
        clusterId
      }),
    {
      async onSuccess(data) {
        if (data?.orderID && data.type === ClusterType.Enterprise) {
          const _link = await getFileByName(ossFileName);
          setOssLink(_link);
        }
      }
    }
  );

  return (
    <Box
      flex={1}
      pt="64px"
      pb="40px"
      px={{
        base: '56px',
        xl: '130px'
      }}
      bg="#F4F6F8"
      overflow="scroll"
    >
      <Text mb="20px" color={'#262A32'} fontSize={'28px'} fontWeight={600} alignSelf={'flex-start'}>
        集群安装教程
      </Text>
      <Accordion color={'#24282C'} allowMultiple>
        <AccordionItem bg="#fff" border={'none'} p="10px 32px" mb="8px" borderRadius={'12px'}>
          <AccordionButton px="0px" _hover={{ bg: '#fff' }}>
            <CheckListIcon w="20px" h="20px" />
            <Text ml="16px" fontSize={'18px'} fontWeight={600}>
              准备工作
            </Text>
            <AccordionIcon ml="auto" w="24px" h="24px" />
          </AccordionButton>
          <AccordionPanel py="20px" pl="40px" gap={'12px'}>
            <Text fontSize={'18px'} fontWeight={600}>
              服务器
            </Text>
            <Box mt="9px" fontSize={'14px'} fontWeight={400}>
              <Text display={'inline-block'} color={'#219BF4'}>
                奇数台
              </Text>
              的 master 服务器及任意的 node 服务器。推荐使用 ubuntu 22.04 LTS linux
              发行版，操作系统内核在 5.4 以上。
            </Box>
            <Text mt="12px" fontSize={'14px'} fontWeight={500}>
              服务器配置：
            </Text>
            <Flex mt="12px" alignItems={'center'}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M7.19194 2.06803C7.52194 1.39936 8.47594 1.39936 8.80594 2.06803L10.3779 5.25336L13.8933 5.76403C14.6313 5.8707 14.9259 6.7787 14.3919 7.29936L11.8479 9.7787L12.4486 13.2787C12.5753 14.0147 11.8033 14.5754 11.1426 14.228L7.99861 12.5747L4.85527 14.228C4.19527 14.5747 3.42327 14.0147 3.54861 13.2794L4.14927 9.7787L1.60594 7.2987C1.07194 6.7787 1.36661 5.87136 2.10461 5.76403L5.61994 5.25336L7.19194 2.06803Z"
                  fill="#36ADEF"
                />
              </svg>
              <Text fontSize={'14px'} fontWeight={500}>
                推荐配置
              </Text>
            </Flex>
            <Box
              mt="12px"
              fontSize={'12px'}
              fontWeight={400}
              borderRadius={'4px'}
              border={'1px solid #EAEBF0'}
              w="fit-content"
            >
              <Flex bg="#F4F6F8" p="8px 20px">
                <Text>CPU</Text>
                <Text px="70px">内存</Text>
                <Text>存储卷</Text>
              </Flex>
              <Flex p="8px 20px">
                <Text>4 Core</Text>
                <Text pl="60px" pr="70px">
                  8 G
                </Text>
                <Text>100 G</Text>
              </Flex>
            </Box>
            <Text mt="12px" fontSize={'14px'} fontWeight={500}>
              最小配置
            </Text>
            <Box
              mt="12px"
              fontSize={'12px'}
              fontWeight={400}
              borderRadius={'4px'}
              border={'1px solid #EAEBF0'}
              w="fit-content"
            >
              <Flex bg="#F4F6F8" p="8px 20px">
                <Text>CPU</Text>
                <Text px="70px">内存</Text>
                <Text>存储卷</Text>
              </Flex>
              <Flex p="8px 20px">
                <Text>2 Core</Text>
                <Text pl="60px" pr="70px">
                  4 G
                </Text>
                <Text>60 G</Text>
              </Flex>
            </Box>
            <Divider my="30px" />
            <Text mt="12px" fontSize={'18px'} fontWeight={600}>
              网络
            </Text>
            <Box mt="12px" fontSize={'14px'} fontWeight={400}>
              服务器之间的网络互通，其中
              <Text display={'inline-block'} color={'#219BF4'} px="4px">
                master0
              </Text>
              （执行 sealos cli 的 master 节点）可以通过 ssh
              免密登陆到其他节点；所有节点间可以互相通信。
            </Box>
            <Divider my="30px" />
            <Text mt="12px" fontSize={'18px'} fontWeight={600}>
              域名
            </Text>
            <Box mt="12px" fontSize={'14px'} fontWeight={400}>
              你需要一个域名，用于访问 Sealos 及你将部署的各种服务。如果您没有域名，可以使用
              <Link href="https://nip.io/" color={'#219BF4'} px="4px">
                nip.io
              </Link>
              提供的免费域名服务。
            </Box>
            <Divider my="30px" />
            <Text mt="12px" fontSize={'18px'} fontWeight={600}>
              证书
            </Text>
            <Box mt="12px" fontSize={'14px'} fontWeight={400}>
              Sealos 需要使用证书来保证通信安全，默认在您不提供证书的情况下我们会使用
              <Link href="https://cert-manager.io/docs/" color={'#219BF4'} px="4px">
                cret-manager
              </Link>
              来自动签发证书。
            </Box>
            <Text mt="12px" fontSize={'14px'} fontWeight={400}>
              如果您能提供证书，证书需要解析下列域名（假设您提供的域名为：cloud.example.io）：
            </Text>
            <Flex
              mt="12px"
              flexDirection={'column'}
              p="12px 16px"
              bg="#F8FAFB"
              width={'fit-content'}
            >
              <Box fontSize={'14px'} fontWeight={400}>
                <Text color={'#9CA2A8'} display={'inline-block'} pr="8px">
                  1
                </Text>
                *.cloud.example.io
              </Box>
              <Box mt="4px" fontSize={'14px'} fontWeight={400}>
                <Text color={'#9CA2A8'} display={'inline-block'} pr="8px">
                  2
                </Text>
                cloud.example.io
              </Box>
            </Flex>
          </AccordionPanel>
        </AccordionItem>

        {data?.type === ClusterType.Enterprise && (
          <AccordionItem bg="#fff" border={'none'} p="10px 32px" mb="8px" borderRadius={'12px'}>
            <AccordionButton px="0px" _hover={{ bg: '#fff' }}>
              <OfflineIcon w="20px" h="20px" />
              <Text ml="16px" fontSize={'18px'} fontWeight={600}>
                离线安装
              </Text>
              <AccordionIcon ml="auto" w="24px" h="24px" />
            </AccordionButton>
            <AccordionPanel py="20px" pl="40px" gap={'12px'}>
              <Text fontSize={'16px'} fontWeight={600}>
                下载离线包
              </Text>
              <Center
                borderRadius={'4px'}
                cursor={'pointer'}
                mt="12px"
                w="218px"
                h="44px"
                color={'#FFF'}
                bg="#36ADEF"
                onClick={() => downloadFromURL(ossLink)}
              >
                <DownloadIcon fill={'#fff'} mr="8px" />
                <Text>点击下载</Text>
              </Center>

              <Text mt="24px" fontSize={'16px'} fontWeight={600} mb="12px">
                服务器上下载
              </Text>
              <CodeBlock language="bash" code={`wget '${ossLink}'`}></CodeBlock>
              <Divider my="20px" />
              <Text mt="12px" fontSize={'16px'} fontWeight={600} mb="12px">
                部署集群
              </Text>
              <CodeBlock
                language="bash"
                code={`tar xzf ${fileNameParams} && cd sealos-cloud && bash install.sh`}
              ></CodeBlock>
            </AccordionPanel>
          </AccordionItem>
        )}

        <AccordionItem bg="#fff" border={'none'} p="10px 32px" mb="8px" borderRadius={'12px'}>
          <AccordionButton px="0px" _hover={{ bg: '#fff' }}>
            <OnlineComputerIcon w="20px" h="20px" />
            <Text ml="16px" fontSize={'18px'} fontWeight={600}>
              在线安装
            </Text>
            <AccordionIcon ml="auto" w="24px" h="24px" />
          </AccordionButton>
          <AccordionPanel py="20px" pl="40px" gap={'12px'}>
            <CodeBlock
              language="bash"
              code={`curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh ${bashParams}`}
            ></CodeBlock>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
}
