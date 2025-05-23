import { Flex, Text, Box, Center } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { X } from 'lucide-react';
import { TFunction } from 'next-i18next';
import { useGuideModalStore } from '@/stores/guideModal';

export let currentDriver: any = null;

export function destroyDriver() {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }
}

export function startDriver(config: Config) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }
  const driverObj = driver(config);
  currentDriver = driverObj;
  useGuideModalStore.getState().setIsDriverActive(true);
  driverObj.drive();
  return driverObj;
}

export const devboxDriverObj = (openDesktopApp: any, t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  stagePadding: 0,
  stageRadius: 12,

  // @ts-ignore
  steps: [
    {
      element: '.system-devbox',
      popover: {
        side: 'right',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('v2:devbox_create_title')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('v2:devbox_create_desc')}
            </Text>
            <Flex justifyContent={'space-between'} mt={'16px'} alignItems={'center'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                1/5
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
                  openDesktopApp({
                    appKey: 'system-devbox',
                    pathname: '/',
                    query: {
                      action: 'guide'
                    },
                    messageData: {},
                    appSize: 'maximize'
                  });
                }}
              >
                {t('v2:next')}
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
    useGuideModalStore.getState().setIsDriverActive(false);
  }
});

export const appLaunchpadDriverObj = (openDesktopApp: any, t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  stagePadding: 0,
  stageRadius: 12,

  // @ts-ignore
  steps: [
    {
      element: '.system-applaunchpad',
      popover: {
        side: 'right',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',

        PopoverBody: (
          <Box>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('v2:launchpad_create_title')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('v2:launchpad_create_desc')}
            </Text>
            <Flex justifyContent={'space-between'} mt={'16px'} alignItems={'center'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                1/4
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
                  openDesktopApp({
                    appKey: 'system-applaunchpad',
                    pathname: '/redirect',
                    query: {
                      action: 'guide'
                    },
                    messageData: {},
                    appSize: 'maximize'
                  });
                }}
              >
                {t('v2:next')}
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
    useGuideModalStore.getState().setIsDriverActive(false);
  }
});

export const templateDriverObj = (openDesktopApp: any, t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  stagePadding: 0,
  stageRadius: 12,

  // @ts-ignore
  steps: [
    {
      element: '.system-template',
      popover: {
        side: 'right',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('v2:template_create_title')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('v2:template_create_desc')}
            </Text>
            <Flex justifyContent={'space-between'} mt={'16px'} alignItems={'center'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                1/4
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
                  openDesktopApp({
                    appKey: 'system-template',
                    pathname: '/',
                    query: {
                      action: 'guide'
                    },
                    messageData: {},
                    appSize: 'maximize'
                  });
                }}
              >
                {t('v2:next')}
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
    useGuideModalStore.getState().setIsDriverActive(false);
  }
});

export const databaseDriverObj = (openDesktopApp: any, t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  stagePadding: 0,
  stageRadius: 12,

  // @ts-ignore
  steps: [
    {
      element: '.system-dbprovider',
      popover: {
        side: 'right',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Box>
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('v2:database_create_title')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('v2:database_create_desc')}
            </Text>
            <Flex justifyContent={'space-between'} mt={'16px'} alignItems={'center'}>
              <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                1/4
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
                  openDesktopApp({
                    appKey: 'system-dbprovider',
                    pathname: '/redirect',
                    query: {
                      action: 'guide'
                    },
                    messageData: {},
                    appSize: 'maximize'
                  });
                }}
              >
                {t('v2:next')}
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
    useGuideModalStore.getState().setIsDriverActive(false);
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
      element: '.guide-button',
      popover: {
        side: 'bottom',
        align: 'end',
        PopoverBody: (
          <Box>
            <Flex gap={'4px'} alignItems={'center'}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="17"
                viewBox="0 0 16 17"
                fill="none"
              >
                <path
                  d="M10 9.8335C10.1333 9.16683 10.4667 8.70016 11 8.16683C11.6667 7.56683 12 6.70016 12 5.8335C12 4.77263 11.5786 3.75521 10.8284 3.00507C10.0783 2.25492 9.06087 1.8335 8 1.8335C6.93913 1.8335 5.92172 2.25492 5.17157 3.00507C4.42143 3.75521 4 4.77263 4 5.8335C4 6.50016 4.13333 7.30016 5 8.16683C5.46667 8.6335 5.86667 9.16683 6 9.8335M6 12.5002H10M6.66667 15.1668H9.33333"
                  stroke="white"
                  strokeWidth="1.33"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Text>{t('v2:guide')}</Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>

            <Flex flexDirection={'column'} mt={'8px'} fontSize={'14px'} fontWeight={'400'}>
              {t('v2:quit_guide_description')}
            </Flex>
            <Center
              cursor={'pointer'}
              float={'right'}
              ml={'auto'}
              minW={'40px'}
              bg={'#FFFFFF33'}
              mt={'16px'}
              p={'8px'}
              borderRadius={'8px'}
              onClick={() => {
                currentDriver.destroy();
                currentDriver = null;
              }}
            >
              {t('v2:got_it')}
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
      el.style.border = '1px solid #1C4EF5';
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
    }
  },
  onDestroyed: (element?: Element) => {
    useGuideModalStore.getState().setIsDriverActive(false);
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
    }
  }
});
