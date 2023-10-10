import { useResourceStore } from '@/store/resource';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useEffect } from 'react';
import AppList from './components/appList';
import CronJobList from './components/cronjobList';
import DBList from './components/dbList';
import Header from './components/header';
import OtherList from './components/otherList';

export default function MyApp({ instanceName }: { instanceName: string }) {
  const { resource, setInstanceName } = useResourceStore();
  console.log(resource, 'resource');

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
