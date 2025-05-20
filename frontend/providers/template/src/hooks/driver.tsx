import { useGuideStore } from '@/store/guide';
import { Flex, Text, Box, Center, Image } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';

let currentDriver: any = null;

export function startDriver(config: Config, openDesktopApp?: any) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }

  const driverObj = driver(config);

  currentDriver = driverObj;

  driverObj.drive();

  return driverObj;
}

export const applistDriverObj = (openDesktopApp?: any): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.driver-deploy-button',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box
            width={'250px'}
            bg={'rgba(28, 46, 245, 0.9)'}
            p={'12px'}
            borderRadius={'12px'}
            color={'#fff'}
            position={'fixed'}
            top={'20px'}
            right={'20px'}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                Choose from template
              </Text>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                2/4
              </Text>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              Choose the app you want to deploy, and try out these popular categories
            </Text>
            <Center
              color={'#fff'}
              fontSize={'14px'}
              fontWeight={500}
              cursor={'pointer'}
              mt={'16px'}
              borderRadius={'8px'}
              background={'rgba(255, 255, 255, 0.20)'}
              w={'fit-content'}
              h={'32px'}
              p={'8px'}
              onClick={() => {
                startDriver(quitGuideDriverObj);
              }}
            >
              Quit Guide
            </Center>
          </Box>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      // 保存原始样式以便稍后恢复
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      // 应用新的边框样式
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5'; // 使用蓝色 #1C4EF5

      el.addEventListener(
        'click',
        () => {
          if (currentDriver) {
            currentDriver.destroy();
            currentDriver = null;
          }
        },
        { once: true }
      );
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
    }
  },
  onDestroyed: () => {}
});

export const deployDriverObj = (openDesktopApp?: any): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.create-app-btn',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',

        PopoverBody: (
          <Box
            width={'250px'}
            bg={'rgba(28, 46, 245, 0.9)'}
            p={'12px'}
            borderRadius={'12px'}
            color={'#fff'}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                One click deploy
              </Text>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                3/4
              </Text>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              Before clicking, review the app details, pricing, and resource requirements
            </Text>
            <Center
              color={'#fff'}
              fontSize={'14px'}
              fontWeight={500}
              cursor={'pointer'}
              mt={'16px'}
              borderRadius={'8px'}
              background={'rgba(255, 255, 255, 0.20)'}
              w={'fit-content'}
              h={'32px'}
              p={'8px'}
              onClick={() => {
                startDriver(quitGuideDriverObj);
              }}
            >
              Quit Guide
            </Center>
          </Box>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      // 保存原始样式以便稍后恢复

      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      // 应用新的边框样式
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5'; // 使用蓝色 #1C4EF5

      el.addEventListener(
        'click',
        () => {
          if (currentDriver) {
            currentDriver.destroy();
            currentDriver = null;
          }
        },
        { once: true }
      );
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
    }
  },
  onDestroyed: () => {}
});

export const detailDriverObj = (openDesktopApp?: any): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.app-launchpad',
      popover: {
        side: 'right',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box
            width={'250px'}
            bg={'rgba(28, 46, 245, 0.9)'}
            p={'12px'}
            borderRadius={'12px'}
            color={'#fff'}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                Access Application
              </Text>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                4/4
              </Text>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              Get the private or public address from App Launchpad.
            </Text>
            <Text color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              Click anywhere to finish the tutorial.
            </Text>
            <Center
              color={'#fff'}
              fontSize={'14px'}
              fontWeight={500}
              cursor={'pointer'}
              mt={'16px'}
              borderRadius={'8px'}
              background={'rgba(255, 255, 255, 0.20)'}
              w={'fit-content'}
              h={'32px'}
              p={'8px'}
              onClick={() => {
                startDriver(quitGuideDriverObj);
              }}
            >
              Quit Guide
            </Center>
          </Box>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      // 保存原始样式以便稍后恢复
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      // 应用新的边框样式
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5'; // 使用蓝色 #1C4EF5

      el.addEventListener(
        'click',
        (e: any) => {
          if (currentDriver) {
            currentDriver.destroy();
            currentDriver = null;
          }
        },
        { once: true }
      );
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
    }
  },
  onDestroyed: () => {
    startDriver(quitGuideDriverObj);
  }
});

export const quitGuideDriverObj: Config = {
  showProgress: false,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: true,
  overlayColor: 'transparent',

  steps: [
    {
      popover: {
        side: 'bottom',
        align: 'end',
        PopoverBody: (
          <Box
            color={'black'}
            borderRadius={'20px'}
            bg={'#FFF'}
            boxShadow={
              '0px 16px 48px -5px rgba(0, 0, 0, 0.12), 0px 8px 12px -5px rgba(0, 0, 0, 0.08)'
            }
            p={'4px'}
            w={'460px'}
          >
            <Box w={'100%'} border={'1px solid #B0CBFF'} borderRadius={'16px'}>
              <Box px={'24px'}>
                <Text mt={'32px'} color={'#000'} fontSize={'20px'} fontWeight={600}>
                  We’re still here!
                </Text>
                <Text mt={'8px'} color={'#404040'} fontSize={'14px'} fontWeight={400}>
                  You can always find your way back to this guide in the top navigation bar. Happy
                  exploring!
                </Text>
                <Image mt={'20px'} src={'/guide-image.png'} alt="guide" />
              </Box>

              <Center
                cursor={'pointer'}
                mt={'20px'}
                borderTop={'1px solid #E4E4E7'}
                py={'20px'}
                px={'24px'}
                onClick={() => {
                  if (currentDriver) {
                    currentDriver.destroy();
                    currentDriver = null;
                  }
                }}
              >
                Got it
              </Center>
            </Box>
          </Box>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      // 保存原始样式以便稍后恢复
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      // 应用新的边框样式
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5'; // 使用蓝色 #1C4EF5
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
    }
  },
  onDestroyed: () => {
    console.log('onDestroyed quitGuideDriverObj');
    // dev = false , prod = true
    useGuideStore.getState().resetGuideState(true);
  }
};
