import { useGuideStore } from '@/stores/guide';
import { Flex, Text, Box, Center, Image } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { X, CircleCheckBig } from 'lucide-react';
import { sealosApp } from 'sealos-desktop-sdk/app';

let currentDriver: any = null;

export const destroyDriver = () => {
  if (currentDriver) {
    currentDriver?.destroy();
    currentDriver = null;
  }
};

export function startDriver(config: Config, openDesktopApp?: any) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }

  const driverObj = driver(config);

  currentDriver = driverObj;

  driverObj.drive();
  driverObj.refresh();

  return driverObj;
}

export const startGuide2 = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.list-create-app-button',
      popover: {
        side: 'bottom',
        align: 'end',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.create_devbox')}
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
              {t('driver.create_tip')}
            </Text>
            <Flex justifyContent={'space-between'} alignItems={'center'} mt={'16px'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                2/5
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
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setGuide2(true);
    currentDriver = null;
  }
});

export const startManageAndDeploy = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: true,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.guide-release-button',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.manage_deploy')}
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
              {t('driver.release_prepare')}
            </Text>
            <Flex justifyContent={'space-between'} alignItems={'center'} mt={'16px'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                5/5
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
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';
    }
  },
  onHighlighted: (element) => {},
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().setManageAndDeploy(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const startguideRelease = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '#guide-online-button',
      popover: {
        side: 'top',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box width={'250px'} bg={'#2563EB'} p={'12px'} borderRadius={'12px'} color={'#fff'}>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.manage_deploy')}
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
              {t('driver.click_deploy')}
            </Text>
            <Text color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('driver.click_anywhere')}
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
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                {t('driver.quit_guide')}
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
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().setguideRelease(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: any, nextStep?: () => void): Config => ({
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
            <Box w={'100%'} borderRadius={'16px'} px={'24px'} position={'relative'}>
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
                {t('driver.create_devbox')}
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
                    appKey: 'system-devbox',
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
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';
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
  onDestroyed: () => {
    console.log('onDestroyed quitGuideDriverObj');
    useGuideStore.getState().resetGuideState(true);
    nextStep && nextStep();
  }
});
