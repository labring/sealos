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
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import ReadMe from './ReadMe';
import CommandForm from './CommandForm';
import LicensePanel from './LicensePanel';
import ClusterPanel from './ClusterPanel';
import useClusterDetail from '@/stores/cluster';
import { useRouter } from 'next/router';

const TAB_QUERY_PARAM = 'tab';
const TAB_QUERY_ARR = ['tutorial', 'cluster', 'license'];

export default function Tutorial({ ossFileUrl }: { ossFileUrl: string }) {
  const { t } = useTranslation();
  const { clusterDetail } = useClusterDetail();
  const { copyData } = useCopyData();
  const [ossLink, setOssLink] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const toast = useToast();
  const router = useRouter();

  const getTabFromQuery = (): string | undefined => {
    return router.query[TAB_QUERY_PARAM] as string;
  };

  const setTabToQuery = (tabType: string) => {
    router.push({ query: { [TAB_QUERY_PARAM]: tabType } });
  };

  const handleTabsChange = (index: number) => {
    setTabIndex(index);
    setTabToQuery(TAB_QUERY_ARR[index]);
  };

  useEffect(() => {
    const selectedTab = getTabFromQuery() || 'tutorial';
    if (clusterDetail?.kubeSystemID) {
      setTabIndex(selectedTab === 'cluster' ? 1 : selectedTab === 'license' ? 2 : 0);
    } else {
      setTabIndex(selectedTab === 'cluster' ? 1 : 0);
    }
  }, [clusterDetail?.kubeSystemID]);

  const { fileNameParams, bashParams, ossVersion } = useMemo(() => {
    if (ossFileUrl) {
      let match = /cloud-(.*?)\.tar/g.exec(ossFileUrl);
      return {
        fileNameParams: ossFileUrl.replace('/cloud/', ''),
        bashParams: match ? `--cloud-version=${match[1]}` : '--cloud-version v5.0.0-beta1',
        ossVersion: match ? `${match[1]}` : 'v5.0.0-beta1'
      };
    } else {
      return {
        fileNameParams: '',
        bashParams: '',
        ossVersion: ''
      };
    }
  }, [ossFileUrl]);

  useQuery(
    ['findClusterByIds', clusterDetail?.clusterId],
    () =>
      findClusterById({
        clusterId: clusterDetail?.clusterId || ''
      }),
    {
      async onSuccess(data) {
        if (data?.orderID && data.type === ClusterType.Enterprise) {
          const _link = await getFileByName(ossFileUrl);
          setOssLink(_link);
        }
      }
    }
  );

  return (
    <Flex flex={1} pt="46px" pb="40px" px={'46px'} bg="#F4F6F8" overflow="scroll">
      <Tabs
        index={tabIndex}
        onChange={handleTabsChange}
        position="relative"
        variant="unstyled"
        height={'100%'}
        w="100%"
      >
        <TabList gap={'8px'} fontWeight={500} fontSize={'18px'}>
          <Tab p="4px" color={tabIndex === 0 ? '#24282C ' : '#5A646E'}>
            部署教程
          </Tab>
          <Tab p="4px" color={tabIndex === 1 ? '#24282C ' : '#5A646E'}>
            集群管理
          </Tab>
          {clusterDetail?.kubeSystemID && (
            <Tab p="4px" color={tabIndex === 2 ? '#24282C ' : '#5A646E'}>
              License 管理
            </Tab>
          )}
        </TabList>
        <TabIndicator mt="-1.5px" height="2px" bg="#24282C" borderRadius="1px" />
        <TabPanels>
          <TabPanel p="0px" mt="32px">
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
                  <ReadMe />
                  <Center
                    borderRadius={'4px'}
                    cursor={'pointer'}
                    mt="20px"
                    w="218px"
                    h="44px"
                    color={'#FFF'}
                    bg="#24282C"
                    fontSize={'14px'}
                    fontWeight={600}
                    onClick={() =>
                      window.open('https://sealos.io/zh-Hans/docs/self-hosting/sealos/installation')
                    }
                  >
                    详细文档
                  </Center>
                </AccordionPanel>
              </AccordionItem>

              {clusterDetail?.type === ClusterType.Enterprise && (
                <AccordionItem
                  bg="#fff"
                  border={'none'}
                  p="10px 32px"
                  mb="8px"
                  borderRadius={'12px'}
                >
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
                      bg="#24282C"
                      fontSize={'14px'}
                      fontWeight={600}
                      onClick={() => downloadFromURL(ossLink)}
                    >
                      <DownloadIcon fill={'#fff'} mr="8px" />
                      <Text>点击下载</Text>
                    </Center>

                    <Text mt="24px" fontSize={'16px'} fontWeight={600} mb="12px">
                      服务器上下载
                    </Text>
                    <CodeBlock
                      language="bash"
                      copyCode={`wget '${ossLink}' -O ${fileNameParams}`}
                      displayCode={`wget '${ossLink}' \\\n -O ${fileNameParams}`}
                    ></CodeBlock>
                    <Divider my="20px" />
                    <Text mt="12px" fontSize={'16px'} fontWeight={600} mb="12px">
                      部署集群
                    </Text>
                    <CommandForm
                      basePath={`tar xzvf ${fileNameParams} && cd sealos-cloud && bash scripts/load-images.sh && bash scripts/install.sh `}
                      cloudVersion={ossVersion}
                      enterprise={true}
                    />
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
                  <CommandForm
                    basePath={`curl -sfL https://mirror.ghproxy.com/https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh --zh  `}
                    cloudVersion={ossVersion}
                  />
                  <Center
                    borderRadius={'4px'}
                    cursor={'pointer'}
                    mt="20px"
                    w="218px"
                    h="44px"
                    color={'#FFF'}
                    bg="#24282C"
                    fontSize={'14px'}
                    fontWeight={600}
                    onClick={() =>
                      window.open('https://sealos.io/zh-Hans/docs/self-hosting/sealos/installation')
                    }
                  >
                    详细文档
                  </Center>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </TabPanel>
          <TabPanel p="0px">
            <ClusterPanel />
          </TabPanel>
          <TabPanel p="0px">
            <LicensePanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  );
}
