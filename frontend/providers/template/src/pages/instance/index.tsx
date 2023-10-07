import { getInstanceByName } from '@/api/instance';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import AppList from './components/appList';
import Header from './components/header';
import DBList from './components/dbList';
import CronJobList from './components/cronjobList';
import OtherList from './components/otherList';
import { useResourceStore } from '@/store/resource';
import { useEffect } from 'react';

export default function MyApp({ instanceName }: { instanceName: string }) {
  const { resource, setInstanceName } = useResourceStore();
  console.log(resource);

  useEffect(() => {
    setInstanceName(instanceName);
  }, [instanceName, setInstanceName]);

  return (
    <Flex flexDirection={'column'} height={'100%'} position={'relative'} background={'#F3F4F5'}>
      <Header instanceName={instanceName}></Header>
      <Box flex={1} px="32px" overflow={'auto'} pt="33px" py="40px">
        <AppList instanceName={instanceName} />
        <DBList instanceName={instanceName} />
        <CronJobList instanceName={instanceName} />
        <OtherList instanceName={instanceName} />
      </Box>
    </Flex>
  );
}

export async function getServerSideProps(content: any) {
  const instanceName = content?.query?.instanceName || '';
  return {
    props: {
      instanceName,
      ...(await serviceSideProps(content))
    }
  };
}
