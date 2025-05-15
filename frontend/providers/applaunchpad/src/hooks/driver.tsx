import { useGuideStore } from '@/store/guide';
import { Flex, Text, Box, Center, Image } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { TFunction } from 'next-i18next';

let currentDriver: any = null;

export function startDriver(config: Config) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }

  const driverObj = driver(config);

  currentDriver = driverObj;

  driverObj.drive();

  return driverObj;
}

export const applistDriverObj = (t: TFunction, nextStep: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
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
                Create Launchpad
              </Text>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              Define your application settings and start deployment
            </Text>
            <Flex justifyContent={'space-between'} alignItems={'center'} mt={'16px'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                2/4
              </Text>
              <Center
                color={'#fff'}
                fontSize={'14px'}
                fontWeight={500}
                cursor={'pointer'}
                borderRadius={'8px'}
                background={'rgba(255, 255, 255, 0.20)'}
                w={'fit-content'}
                h={'32px'}
                p={'8px'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  nextStep();
                }}
              >
                Next
              </Center>
            </Flex>
          </Box>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';

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
      el.style.outline = el._originalOutline || '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setListCompleted(true);
  }
});

export const detailDriverObj = (t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '#driver-detail-network',
      popover: {
        side: 'top',
        align: 'center',
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
              Copy the private or public address for access
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
                startDriver(quitGuideDriverObj(t));
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
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5';

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
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().setDetailCompleted(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: TFunction): Config => ({
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
                  We're still here!
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
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5';
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
    useGuideStore.getState().resetGuideState(true);
  }
});
