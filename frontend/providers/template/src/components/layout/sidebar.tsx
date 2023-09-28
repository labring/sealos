import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';

export type SideBarMenu = {
  id: string;
  url: string;
  acriveUrl: string[];
  value: string;
  icon: ReactElement;
  display: boolean;
  showLayout: boolean;
};

const menus: SideBarMenu[] = [
  {
    id: 'Applications',
    url: '/',
    acriveUrl: ['/', '/deploy'],
    value: 'SideBar.Applications',
    icon: (
      <path d="M2 3H9.425V10.425H2V3ZM3.65 4.65V8.775H7.775V4.65H3.65ZM14.7875 4.65C14.2405 4.65 13.7159 4.8673 13.3291 5.25409C12.9423 5.64089 12.725 6.16549 12.725 6.7125C12.725 7.25951 12.9423 7.78411 13.3291 8.17091C13.7159 8.5577 14.2405 8.775 14.7875 8.775C15.3345 8.775 15.8591 8.5577 16.2459 8.17091C16.6327 7.78411 16.85 7.25951 16.85 6.7125C16.85 6.16549 16.6327 5.64089 16.2459 5.25409C15.8591 4.8673 15.3345 4.65 14.7875 4.65ZM11.075 6.7125C11.075 6.22497 11.171 5.74221 11.3576 5.29179C11.5442 4.84137 11.8176 4.4321 12.1624 4.08737C12.5071 3.74263 12.9164 3.46917 13.3668 3.2826C13.8172 3.09603 14.3 3 14.7875 3C15.275 3 15.7578 3.09603 16.2082 3.2826C16.6586 3.46917 17.0679 3.74263 17.4126 4.08737C17.7574 4.4321 18.0308 4.84137 18.2174 5.29179C18.404 5.74221 18.5 6.22497 18.5 6.7125C18.5 7.69712 18.1089 8.6414 17.4126 9.33763C16.7164 10.0339 15.7721 10.425 14.7875 10.425C13.8029 10.425 12.8586 10.0339 12.1624 9.33763C11.4661 8.6414 11.075 7.69712 11.075 6.7125ZM2 12.075H9.425V19.5H2V12.075ZM3.65 13.725V17.85H7.775V13.725H3.65ZM11.075 12.075H18.5V19.5H11.075V12.075ZM12.725 13.725V17.85H16.85V13.725H12.725Z" />
    ),
    display: true,
    showLayout: true
  },
  {
    id: 'MyApp',
    url: '/app',
    value: 'SideBar.My App',
    acriveUrl: ['/app'],
    icon: (
      <path d="M10.3 2C11.4006 2 12.4562 2.43723 13.2345 3.21551C14.0128 3.99378 14.45 5.04935 14.45 6.15C14.45 7.25065 14.0128 8.30622 13.2345 9.08449C12.4562 9.86277 11.4006 10.3 10.3 10.3C9.19935 10.3 8.14378 9.86277 7.36551 9.08449C6.58723 8.30622 6.15 7.25065 6.15 6.15C6.15 5.04935 6.58723 3.99378 7.36551 3.21551C8.14378 2.43723 9.19935 2 10.3 2ZM10.3 4.075C9.74968 4.075 9.22189 4.29362 8.83275 4.68275C8.44362 5.07189 8.225 5.59968 8.225 6.15C8.225 6.70032 8.44362 7.22811 8.83275 7.61725C9.22189 8.00638 9.74968 8.225 10.3 8.225C10.8503 8.225 11.3781 8.00638 11.7672 7.61725C12.1564 7.22811 12.375 6.70032 12.375 6.15C12.375 5.59968 12.1564 5.07189 11.7672 4.68275C11.3781 4.29362 10.8503 4.075 10.3 4.075ZM10.3 11.3375C13.0701 11.3375 18.6 12.7174 18.6 15.4875V18.6H2V15.4875C2 12.7174 7.52988 11.3375 10.3 11.3375ZM10.3 13.3088C7.21863 13.3088 3.97125 14.8235 3.97125 15.4875V16.6288H16.6288V15.4875C16.6288 14.8235 13.3814 13.3088 10.3 13.3088Z" />
    ),
    display: true,
    showLayout: true
  }
];

export default function SideBar({ isMobile }: { isMobile: boolean }) {
  const router = useRouter();
  const { t, ready } = useTranslation();

  return (
    <Flex flexDirection="column" mt="8px">
      {menus &&
        menus
          .filter((item) => item.display)
          .map((item) => {
            return (
              <Flex
                borderRadius={'4px'}
                background={
                  item.acriveUrl.includes(router.route) ? 'rgba(150, 153, 180, 0.15)' : ''
                }
                _hover={{
                  background: 'rgba(150, 153, 180, 0.10)'
                }}
                key={item.id}
                mt="8px"
                p="12px"
                h="44px"
                alignItems={'center'}
                as={'button'}
                onClick={() => {
                  router.push(item.url);
                }}>
                <Icon
                  flexShrink={0}
                  w="18px"
                  h="18px"
                  fill={item.acriveUrl.includes(router.route) ? '#219BF4' : '#485058'}
                  viewBox="0 0 20 21"
                  alignItems={'center'}>
                  {item.icon}
                </Icon>
                {!isMobile && (
                  <Text
                    ml="10px"
                    color={item.acriveUrl.includes(router.route) ? '#219BF4' : '#485058'}
                    fontSize={'16px'}
                    fontWeight={500}>
                    {t(item.value)}
                  </Text>
                )}
              </Flex>
            );
          })}
    </Flex>
  );
}
