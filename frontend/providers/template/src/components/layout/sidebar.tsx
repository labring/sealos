import { SideBarMenu } from '@/store/config';
import { useSearchStore } from '@/store/search';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export default function SideBar() {
  const { t } = useTranslation();
  const { appType, setAppType } = useSearchStore();
  const router = useRouter();

  return (
    <Flex flexDirection="column" mt="8px" flex={1}>
      {SideBarMenu &&
        SideBarMenu.map((item) => {
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
