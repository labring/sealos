import { useSearchStore } from '@/store/search';
import { ApplicationType, SideBarMenuType } from '@/types/app';
import { Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { getTemplates } from '@/api/platform';

export default function SideBar() {
  const { t, i18n } = useTranslation();
  const { appType, setAppType } = useSearchStore();
  const router = useRouter();

  const { data } = useQuery(['listTemplate', i18n.language], () => getTemplates(i18n.language), {
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 3,
    /**
     * Avoid executing axios with a relative baseURL during SSR render.
     * The server will prefetch and hydrate this query from `_app.getInitialProps`.
     */
    enabled: typeof window !== 'undefined'
  });

  const sideBarMenu: SideBarMenuType[] = useMemo(() => {
    const base: SideBarMenuType[] = [
      {
        id: 'applications',
        type: ApplicationType.All,
        value: 'SideBar.Applications'
      }
    ];

    const menuKeys = data?.menuKeys ?? '';
    if (!menuKeys) return base;

    const menus: SideBarMenuType[] = menuKeys
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean)
      .map((i) => ({
        id: i,
        type: i as ApplicationType,
        value: `SideBar.${i}`
      }));

    return [...base, ...menus];
  }, [data?.menuKeys]);

  return (
    <Flex flexDirection="column" mt="8px" flex={1}>
      {sideBarMenu &&
        sideBarMenu.map((item) => {
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
              cursor={'pointer'}
              id={item.id}
              onClick={() => {
                router.replace('/');
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
