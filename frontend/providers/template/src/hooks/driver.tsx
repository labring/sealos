import { useGuideStore } from '@/store/guide';
import { Flex, Text, Box, Center, Image } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { TFunction } from 'i18next';
import { CircleCheckBig, X } from 'lucide-react';
import { sealosApp } from 'sealos-desktop-sdk/app';

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

export const detailDriverObj = (t: TFunction, nextStep?: () => void): Config => ({
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
        side: 'top',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.access_application')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('driver.access_application_desc')}
            </Text>
            <Text color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('driver.click_anywhere_to_finish')}
            </Text>
            <Flex justifyContent={'space-between'} alignItems={'center'} mt={'16px'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                4/4
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
                  nextStep && nextStep();
                }}
              >
                {t('driver.next')}
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
      el.style.borderRadius = '8px';
      el.style.outline = '1.5px solid #1C4EF5';
      el.style.outlineOffset = '2px';
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.outline = '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().setListCompleted(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: TFunction): Config => {
  return {
    showProgress: false,
    allowClose: false,
    allowClickMaskNextStep: false,
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
            <Box color={'black'} borderRadius={'16px'} bg={'#FFF'} p={'4px'} w={'460px'}>
              <Box w={'100%'} borderRadius={'16px'} px={'24px'}>
                <Box>
                  <Box mt={'32px'}>
                    <CircleCheckBig size={32} color="#2563EB" />
                  </Box>
                  <Text my={'8px'} color={'#000'} fontSize={'20px'} fontWeight={600}>
                    {t('driver.still_here')}
                  </Text>
                  <Text mt={'8px'} color={'#404040'} fontSize={'14px'} fontWeight={400}>
                    {t('driver.still_here_desc')}
                  </Text>
                  <Image mt={'20px'} src={'/guide-image.png'} alt="guide" />
                </Box>

                <Center
                  mt={'20px'}
                  h={'40px'}
                  borderRadius={'8px'}
                  border={'1px solid #E4E4E7'}
                  background={'#FFF'}
                  cursor={'pointer'}
                  py={'20px'}
                  px={'24px'}
                  onClick={() => {
                    if (currentDriver) {
                      currentDriver.destroy();
                      currentDriver = null;
                    }
                    window.location.href = '/';
                  }}
                >
                  {t('driver.create_template')}
                </Center>
                <Center
                  mt={'12px'}
                  mb={'20px'}
                  h={'40px'}
                  borderRadius={'8px'}
                  border={'1px solid #E4E4E7'}
                  background={'#FFF'}
                  cursor={'pointer'}
                  py={'20px'}
                  px={'24px'}
                  onClick={() => {
                    if (currentDriver) {
                      currentDriver.destroy();
                      currentDriver = null;
                    }
                    sealosApp.runEvents('quitGuide', {
                      appKey: 'system-template',
                      pathname: '/',
                      messageData: { type: 'InternalAppCall', action: 'quitGuide' }
                    });
                  }}
                >
                  {t('driver.quit_guide')}
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
  };
};
