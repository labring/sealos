import { Center, Text, Stack } from '@chakra-ui/react';
import MyIcon from '../Icon';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export const ROUTES = {
  OVERVIEW: '/app/detail',
  MONITOR: '/app/detail/monitor',
  LOGS: '/app/detail/logs'
} as const;

export default function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();

  const siderbarMap = [
    {
      label: t('overview'),
      icon: (
        <MyIcon
          name="pods"
          w={'24px'}
          h={'24px'}
          color={router.pathname === ROUTES.OVERVIEW ? 'grayModern.900' : 'grayModern.500'}
        />
      ),
      path: ROUTES.OVERVIEW
    },
    {
      label: t('monitor'),
      icon: (
        <MyIcon
          name="monitor"
          w={'24px'}
          h={'24px'}
          color={router.pathname === ROUTES.MONITOR ? 'grayModern.900' : 'grayModern.500'}
        />
      ),
      path: ROUTES.MONITOR
    },
    {
      label: t('Log'),
      icon: (
        <MyIcon
          name="log"
          w={'24px'}
          h={'24px'}
          color={router.pathname === ROUTES.LOGS ? 'grayModern.900' : 'grayModern.500'}
        />
      ),
      path: ROUTES.LOGS
    }
  ];

  return (
    <Stack
      w={'76px'}
      py={'12px'}
      px={'8px'}
      flexShrink={0}
      spacing={'8px'}
      borderRadius={'8px'}
      bg={'white'}
    >
      {siderbarMap.map((item) => (
        <Center
          key={item.path}
          gap={'4px'}
          flexDirection={'column'}
          bg={router.pathname === item.path ? 'rgba(150, 153, 180, 0.15)' : 'transparent'}
          color={'grayModern.900'}
          borderRadius={'md'}
          h={'60px'}
          cursor={'pointer'}
          onClick={() => {
            console.log(router.query);
            router.push({
              pathname: item.path,
              query: { ...router.query }
            });
          }}
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
