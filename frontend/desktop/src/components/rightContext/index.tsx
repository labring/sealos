import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { MouseEvent, ReactElement, ReactNode, useState } from 'react';

export type SideBarMenu = {
  id: string;
  value: string;
  icon: ReactElement;
  click: () => void;
};

export default function RightContext({ children }: { children: ReactNode }) {
  const [contextOpen, setContextOpen] = useState(false);
  const [xYPosistion, setXyPosistion] = useState({ x: 0, y: 0 });

  const showNav = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const positionChange = {
      x: e.pageX,
      y: e.pageY
    };
    setXyPosistion(positionChange);
    setContextOpen(true);
  };

  const hideContext = (e: MouseEvent<HTMLDivElement>) => {
    setContextOpen(false);
  };

  const menus: SideBarMenu[] = [
    {
      id: 'appinfo',
      value: 'App Info',
      icon: (
        <path d="M4.66667 11.3333H9.33333V10H4.66667V11.3333ZM4.66667 8.66667H11.3333V7.33333H4.66667V8.66667ZM4.66667 6H11.3333V4.66667H4.66667V6ZM3.33333 14C2.96667 14 2.65278 13.8694 2.39167 13.6083C2.13056 13.3472 2 13.0333 2 12.6667V3.33333C2 2.96667 2.13056 2.65278 2.39167 2.39167C2.65278 2.13056 2.96667 2 3.33333 2H12.6667C13.0333 2 13.3472 2.13056 13.6083 2.39167C13.8694 2.65278 14 2.96667 14 3.33333V12.6667C14 13.0333 13.8694 13.3472 13.6083 13.6083C13.3472 13.8694 13.0333 14 12.6667 14H3.33333ZM3.33333 12.6667H12.6667V3.33333H3.33333V12.6667Z" />
      ),
      click: () => {
        console.log(111);
      }
    }
  ];

  return (
    <Box onContextMenu={showNav} onClick={hideContext} position={'relative'}>
      {children}
      {contextOpen && (
        <Box
          cursor={'pointer'}
          position={'fixed'}
          top={xYPosistion.y + 15}
          left={xYPosistion.x + 10}
          border={'1px solid #FFF'}
          background={'rgba(244, 246, 248, 0.90)'}
          backdropFilter={'blur(50px)'}
          borderRadius={'4px'}
          boxShadow={'0px 1.16667px 2.33333px 0px rgba(0, 0, 0, 0.20)'}
          zIndex={9999}
          p="6px"
        >
          {menus.map((item) => {
            return (
              <Flex
                w="118px"
                h="30px"
                key={item.id}
                onClick={item.click}
                alignItems={'center'}
                overflow={'hidden'}
                px="4px"
                _hover={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  color: '#0884DD',
                  svg: {
                    fill: '#0884DD'
                  }
                }}
              >
                <Icon fill={'#5A646E'} w={'16px'} h="16px" viewBox="0 0 16 16">
                  {item.icon}
                </Icon>
                <Text pl="8px">{item.value}</Text>
              </Flex>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
