import {
  Center,
  Spinner,
  Stack,
  StackProps,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import DnsIcon from '../Icons/DnsIcon';
import MonitorIcon from '../Icons/MonitorIcon';
import { useOssStore } from '@/store/ossStore';
import BucketHeader from './BucketHeader';
import FileManager from './FileManager';
import DataMonitor from './Monitor';
import { useTranslation } from 'next-i18next';
import { Authority } from '@/consts';
import { HostStatus } from '@/components/BucketContainer/HostStatus';

export default function BucketContainer(props: StackProps) {
  const bucket = useOssStore((s) => s.currentBucket);
  const { t } = useTranslation('file');
  const { t: bucketT } = useTranslation('bucket');
  const tabTitle = [
    { icon: DnsIcon, title: t('directory') },
    { icon: MonitorIcon, title: t('monitoring') }
  ] as const;
  if (process.env.NODE_ENV !== 'development' && !bucket) return <></>;
  return (
    <Stack px="42px" py="28px" w="full" h="full" {...props}>
      {bucket?.isComplete ? (
        <>
          <BucketHeader />
          <Tabs isLazy flex="1" display={'flex'} flexDir={'column'}>
            <TabList>
              {tabTitle.map((item) => (
                <Tab
                  key={item.title}
                  alignItems={'center'}
                  gap="8px"
                  py="16px"
                  sx={{
                    svg: {
                      color: 'grayModern.500'
                    },
                    p: {
                      color: 'grayModern.600'
                    }
                  }}
                  _selected={{
                    borderBottom: '2px solid',
                    borderColor: 'GrayModern.900',
                    'svg, p': {
                      color: 'grayModern.900'
                    }
                  }}
                >
                  <item.icon boxSize={'16px'} />
                  <Text fontSize={'14px'}>{item.title}</Text>
                </Tab>
              ))}
              {bucket.policy !== Authority.private && <HostStatus />}
            </TabList>
            <TabPanels h="0" flex="auto" overflow={'auto'}>
              <TabPanel h="full" p="0">
                <FileManager h="full" />
              </TabPanel>
              <TabPanel
                h="full"
                p="0"
                display={'flex'}
                placeItems={'center'}
                flexDirection={'column'}
              >
                <DataMonitor />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      ) : (
        <Center h="full" w="full">
          <Spinner size={'lg'} mr="10px" />
          <Text>{bucketT('initializing')}</Text>
        </Center>
      )}
    </Stack>
  );
}
