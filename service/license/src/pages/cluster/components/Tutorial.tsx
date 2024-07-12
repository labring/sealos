import { findClusterById } from '@/api/cluster';
import { getFileByName } from '@/api/oos';
import CodeBlock from '@/components/CodeBlock';
import {
  BookIcon,
  CheckListIcon,
  DownloadIcon,
  OfflineIcon,
  OnlineComputerIcon
} from '@/components/Icon';
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
  Tag,
  TagLeftIcon,
  TagLabel,
  Text,
  useToast,
  Button
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import ReadMe from './ReadMe';
import LicensePanel from './LicensePanel';
import ClusterPanel from './ClusterPanel';
import useClusterDetail from '@/stores/cluster';
import { useRouter } from 'next/router';
import ConfigForm from './ConfigForm';

const TAB_QUERY_PARAM = 'tab';
const TAB_QUERY_ARR = ['tutorial', 'cluster', 'license'];

export type TutorialProps = {
  ossFileUrl: string;
  customBasePatch: string;
};

export default function Tutorial({ ossFileUrl, customBasePatch }: TutorialProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (data?.orderID && data.type !== ClusterType.Standard) {
          const _link = await getFileByName(ossFileUrl);
          setOssLink(_link);
        }
      }
    }
  );

  const DocsComponent = (
    <Tag
      ml="12px"
      onClick={() => window.open('https://sealos.io/zh-Hans/docs/self-hosting/sealos/installation')}
      _hover={{
        color: 'brightBlue.600',
        svg: {
          fill: 'brightBlue.600'
        }
      }}
    >
      <TagLeftIcon as={BookIcon} />
      <TagLabel>详细文档</TagLabel>
    </Tag>
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
        <TabList gap={'8px'} fontSize={'18px'}>
          <Tab p="4px" fontWeight={500} color={tabIndex === 0 ? 'gray.900 ' : 'gray.500'}>
            部署教程
          </Tab>
          <Tab p="4px" fontWeight={500} color={tabIndex === 1 ? 'gray.900 ' : 'gray.500'}>
            集群管理
          </Tab>
          {clusterDetail?.kubeSystemID && (
            <Tab p="4px" fontWeight={500} color={tabIndex === 2 ? 'gray.900 ' : 'gray.500'}>
              License 管理
            </Tab>
          )}
        </TabList>
        <TabIndicator mt="-1.5px" height="2px" bg="#24282C" borderRadius="1px" />
        <TabPanels>
          <TabPanel p="0" mt="32px">
            <Accordion color={'#24282C'} allowToggle>
              <AccordionItem
                bg="#fff"
                border={'1px solid #E8EBF0'}
                p="10px 32px"
                mb="8px"
                borderRadius={'12px'}
              >
                <AccordionButton px="0" _hover={{ bg: '#fff' }}>
                  <CheckListIcon w="20px" h="20px" />
                  <Text ml="16px" fontSize={'18px'} fontWeight={600}>
                    准备工作
                  </Text>
                  {DocsComponent}
                  <AccordionIcon ml="auto" w="24px" h="24px" />
                </AccordionButton>
                <AccordionPanel py="16px" pl="32px">
                  <ReadMe />
                </AccordionPanel>
              </AccordionItem>

              {clusterDetail?.type !== ClusterType.Standard && (
                <AccordionItem
                  bg="#fff"
                  border={'1px solid #E8EBF0'}
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
                    <Button
                      mt="12px"
                      size={'lg'}
                      variant={'black'}
                      onClick={() => downloadFromURL(ossLink)}
                    >
                      点击下载
                    </Button>

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
                    <ConfigForm
                      basePath={`tar xzvf ${fileNameParams} && cd sealos-cloud && bash scripts/load-images.sh && bash scripts/install.sh `}
                      cloudVersion={ossVersion}
                      enterprise={true}
                    />
                  </AccordionPanel>
                </AccordionItem>
              )}

              <AccordionItem
                bg="#fff"
                border={'1px solid #E8EBF0'}
                p="10px 32px"
                mb="8px"
                borderRadius={'12px'}
              >
                <AccordionButton px="0px" _hover={{ bg: '#fff' }}>
                  <OnlineComputerIcon w="20px" h="20px" />
                  <Text ml="16px" fontSize={'18px'} fontWeight={600}>
                    在线安装
                  </Text>
                  {DocsComponent}
                  <AccordionIcon ml="auto" w="24px" h="24px" />
                </AccordionButton>
                <AccordionPanel py="20px" px="0px">
                  <ConfigForm
                    basePath={`curl -sfL ${customBasePatch} -o /tmp/install.sh && bash /tmp/install.sh --zh  `}
                    cloudVersion={ossVersion}
                  />
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
