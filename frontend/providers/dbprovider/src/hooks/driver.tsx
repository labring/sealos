import { useGuideStore } from '@/store/guide';
import { Flex, Text, Box, Center, Image } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { CircleCheckBig, X } from 'lucide-react';
import { TFunction } from 'next-i18next';
import { sealosApp } from 'sealos-desktop-sdk/app';

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

export const applistDriverObj = (t: TFunction, nextStep?: () => void): Config => ({
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
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.access_database')}
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
              {t('driver.define_settings')}
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
      // 保存原始样式以便稍后恢复
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el._originalOutline = el.style.outline;

      // 应用新的边框样式
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
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setApplistCompleted(true);
  }
});

export const detailDriverObj = (t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: true,
  overlayColor: 'transparent',

  steps: [
    {
      element: '#network-detail',
      popover: {
        side: 'right',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.manage_database')}
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
              {t('driver.connection_details')}
            </Text>
            <Text color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('driver.click_anywhere')}
            </Text>
            <Flex alignItems={'center'} justifyContent={'space-between'} mt={'16px'}>
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
                  startDriver(quitGuideDriverObj(t));
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
    console.log('onDestroyed detailDriverObj');
    useGuideStore.getState().setDetailCompleted(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: TFunction, nextStep?: () => void): Config => ({
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
          <Box color={'black'} borderRadius={'16px'} w={'460px'}>
            <Box w={'100%'} borderRadius={'16px'} px={'24px'}>
              <Box>
                <Box mt={'32px'}>
                  <CircleCheckBig size={32} color="#2563EB" />
                </Box>
                <Text my={'8px'} color={'#000'} fontSize={'20px'} fontWeight={600}>
                  {t('driver.still_here')}
                </Text>
                <Text mt={'8px'} color={'#404040'} fontSize={'14px'} fontWeight={400}>
                  {t('driver.find_guide_tip')}
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
                {t('driver.create_db')}
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
                    appKey: 'system-dbprovider',
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
});
