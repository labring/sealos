import { Center, Text, Stack } from '@chakra-ui/react';
import MyIcon from '../Icon';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();

  const siderbarMap = [
    {
      label: t('DataBase'),
      icon: (
        <MyIcon
          name="logoLinear"
          w={'24px'}
          h={'24px'}
          color={router.pathname === '/dbs' ? 'black' : 'grayModern.500'}
        />
      ),
      path: '/dbs'
    },
    {
      label: t('Backup'),
      icon: (
        <MyIcon
          name="backup"
          w={'24px'}
          h={'24px'}
          color={router.pathname === '/backups' ? 'black' : 'grayModern.500'}
        />
      ),
      path: '/backups'
    }
  ];

  return (
    <Stack w={'80px'} py={'12px'} px={'8px'} flexShrink={0} spacing={'8px'}>
      {siderbarMap.map((item) => (
        <Center
          key={item.path}
          gap={'4px'}
          flexDirection={'column'}
          bg={router.pathname === item.path ? 'rgba(150, 153, 180, 0.15)' : 'transparent'}
          color={'grayModern.900'}
          borderRadius={'md'}
          h={'68px'}
          cursor={'pointer'}
          onClick={() => router.replace(item.path)}
        >
          {item.icon}
          <Text fontSize={'11px'} fontWeight={'bold'}>
            {item.label}
          </Text>
        </Center>
      ))}
    </Stack>
  );
}
