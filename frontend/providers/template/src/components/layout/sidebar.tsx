import { useSearchStore } from '@/store/search';
import { ApplicationType, SideBarMenuType } from '@/types/app';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { getCategoryLabel } from '@/utils/template';

export default function SideBar() {
  const { t, i18n } = useTranslation();
  const { appType, setAppType } = useSearchStore();
  const router = useRouter();
  const clientAppConfig = useClientAppConfig();

  const sideBarMenu: SideBarMenuType[] = useMemo(() => {
    const base: SideBarMenuType[] = [
      {
        id: 'applications',
        type: ApplicationType.All,
        value: t('SideBar.Applications')
      }
    ];

    const menus: SideBarMenuType[] = clientAppConfig.categories.map((category) => ({
      id: category.slug,
      type: category.slug as ApplicationType,
      value: getCategoryLabel(category, i18n.language)
    }));

    return [...base, ...menus];
  }, [clientAppConfig.categories, i18n.language, t]);

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
                if (router.pathname !== '/') {
                  router.replace('/');
                }
                setAppType(item.type);
              }}
            >
              <Text
                color={item.type === appType ? '#0884DD' : '#485058'}
                fontSize={'14px'}
                fontWeight={500}
              >
                {item.value}
              </Text>
            </Flex>
          );
        })}
    </Flex>
  );
}
