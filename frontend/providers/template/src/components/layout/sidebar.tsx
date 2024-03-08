import { useSearchStore } from '@/store/search';
import { ApplicationType } from '@/types/app';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

export type SideBarMenu = {
  id: string;
  value: string;
  type: ApplicationType;
  display: boolean;
};

export default function SideBar() {
  const { t } = useTranslation();
  const { appType, setAppType } = useSearchStore();
  const router = useRouter();

  const menus: SideBarMenu[] = useMemo(
    () => [
      {
        id: 'applications',
        type: ApplicationType.All,
        value: 'SideBar.Applications',
        display: true
      },
      {
        id: 'ai',
        type: ApplicationType.AI,
        value: 'SideBar.AI',
        display: true
      },
      {
        id: 'game',
        type: ApplicationType.Game,
        value: 'SideBar.Game',
        display: true
      },
      {
        id: 'monitor',
        type: ApplicationType.Monitor,
        value: 'SideBar.Monitor',
        display: true
      },
      {
        id: 'database',
        type: ApplicationType.Database,
        value: 'SideBar.Database',
        display: true
      },
      {
        id: 'frontend',
        type: ApplicationType.Frontend,
        value: 'SideBar.Frontend',
        display: true
      },
      {
        id: 'backend',
        type: ApplicationType.Backend,
        value: 'SideBar.Backend',
        display: true
      }
    ],
    []
  );

  return (
    <Flex flexDirection="column" mt="8px" flex={1}>
      {menus &&
        menus
          .filter((item) => item.display)
          .map((item) => {
            return (
              <Flex
                borderRadius={'4px'}
                background={item.type === appType ? 'rgba(150, 153, 180, 0.15)' : ''}
                _hover={{
                  background: 'rgba(150, 153, 180, 0.10)'
                }}
                key={item.id}
                mt="4px"
                p="12px"
                h="36px"
                alignItems={'center'}
                as={'button'}
                onClick={() => {
                  router.push('/');
                  setAppType(item.type);
                }}
              >
                <Text
                  color={item.type === appType ? '#0884DD' : '#485058'}
                  fontSize={'14px'}
                  fontWeight={500}
                >
                  {t(item.value)}
                </Text>
              </Flex>
            );
          })}
    </Flex>
  );
}
