import { getBackups } from '@/api/backup';
import Sidebar from '@/components/Sidebar';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';

export default function Backups() {
  const { data } = useQuery(['getBackups'], getBackups, {
    cacheTime: 2 * 60 * 1000
  });

  console.log(data);

  return (
    <Flex bg={'grayModern.100'} h={'100%'} pb={'12px'} pr={'12px'}>
      <Sidebar />
      <Box bg={'white'} px={'32px'} h={'full'} w={'full'} borderRadius={'xl'}>
        backups
      </Box>
    </Flex>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}
