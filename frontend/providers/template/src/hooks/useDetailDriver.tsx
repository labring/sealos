import { checkUserTask, getPriceBonus, getUserTasks } from '@/api/platform';
import MyIcon from '@/components/Icon';
import { useSystemConfigStore } from '@/store/config';
import { useGuideStore } from '@/store/guide';
import { formatMoney } from '@/utils/tools';
import { Center, Flex, Icon, Text } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { CurrencySymbol } from '@sealos/ui';

import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

export function DriverStarIcon() {
  return (
    <Icon xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.24999 1.58789C4.5696 1.58789 4.82869 1.84699 4.82869 2.16659V3.67122H6.33332C6.65293 3.67122 6.91203 3.93032 6.91203 4.24993C6.91203 4.56954 6.65293 4.82863 6.33332 4.82863H4.82869V6.33326C4.82869 6.65287 4.5696 6.91196 4.24999 6.91196C3.93038 6.91196 3.67128 6.65287 3.67128 6.33326V4.82863H2.16666C1.84705 4.82863 1.58795 4.56954 1.58795 4.24993C1.58795 3.93032 1.84705 3.67122 2.16666 3.67122H3.67128V2.16659C3.67128 1.84699 3.93038 1.58789 4.24999 1.58789ZM11.3333 2.42122C11.5728 2.42122 11.7875 2.56869 11.8735 2.79218L13.3186 6.54957C13.5643 7.18827 13.6548 7.41187 13.7853 7.59548C13.9098 7.77051 14.0627 7.92344 14.2378 8.04791C14.4214 8.17846 14.645 8.269 15.2837 8.51465L19.0411 9.9598C19.2646 10.0458 19.412 10.2605 19.412 10.4999C19.412 10.7394 19.2646 10.9541 19.0411 11.0401L15.2837 12.4852C14.645 12.7309 14.4214 12.8214 14.2378 12.9519C14.0627 13.0764 13.9098 13.2293 13.7853 13.4044C13.6548 13.588 13.5643 13.8116 13.3186 14.4503L11.8735 18.2077C11.7875 18.4312 11.5728 18.5786 11.3333 18.5786C11.0939 18.5786 10.8792 18.4312 10.7932 18.2077L9.34804 14.4503C9.10239 13.8116 9.01186 13.588 8.8813 13.4044C8.75684 13.2293 8.60391 13.0764 8.42887 12.9519C8.24526 12.8214 8.02166 12.7309 7.38297 12.4852L3.62558 11.0401C3.40209 10.9541 3.25462 10.7394 3.25462 10.4999C3.25462 10.2605 3.40209 10.0458 3.62558 9.9598L7.38296 8.51465C8.02166 8.269 8.24526 8.17846 8.42887 8.04791C8.60391 7.92345 8.75684 7.77051 8.8813 7.59548C9.01186 7.41187 9.10239 7.18827 9.34804 6.54957L10.7932 2.79219C10.8791 2.56869 11.0939 2.42122 11.3333 2.42122ZM11.3333 4.61201L10.4283 6.96506C10.4195 6.98797 10.4108 7.01059 10.4022 7.03291C10.1924 7.57876 10.0502 7.94881 9.82456 8.26619C9.62512 8.54667 9.38006 8.79173 9.09958 8.99117C8.78221 9.21684 8.41216 9.35905 7.86631 9.56883C7.84398 9.5774 7.82137 9.5861 7.79845 9.59491L5.4454 10.4999L7.79845 11.4049C7.82137 11.4138 7.84398 11.4225 7.86631 11.431C8.41216 11.6408 8.78221 11.783 9.09958 12.0087C9.38006 12.2081 9.62512 12.4532 9.82456 12.7337C10.0502 13.051 10.1924 13.4211 10.4022 13.9669C10.4108 13.9893 10.4195 14.0119 10.4283 14.0348L11.3333 16.3878L12.2383 14.0348C12.2472 14.0119 12.2558 13.9893 12.2644 13.967C12.4742 13.4211 12.6164 13.051 12.8421 12.7337C13.0415 12.4532 13.2866 12.2081 13.5671 12.0087C13.8844 11.783 14.2545 11.6408 14.8003 11.431C14.8227 11.4225 14.8453 11.4138 14.8682 11.4049L17.2212 10.4999L14.8682 9.59491C14.8453 9.5861 14.8227 9.57741 14.8004 9.56883C14.2545 9.35906 13.8844 9.21684 13.5671 8.99117C13.2866 8.79173 13.0415 8.54667 12.8421 8.26619C12.6164 7.94881 12.4742 7.57876 12.2644 7.03291C12.2558 7.01059 12.2472 6.98797 12.2383 6.96505L11.3333 4.61201ZM4.24999 14.0879C4.5696 14.0879 4.82869 14.347 4.82869 14.6666V16.1712H6.33332C6.65293 16.1712 6.91203 16.4303 6.91203 16.7499C6.91203 17.0695 6.65293 17.3286 6.33332 17.3286H4.82869V18.8333C4.82869 19.1529 4.5696 19.412 4.24999 19.412C3.93038 19.412 3.67128 19.1529 3.67128 18.8333V17.3286H2.16666C1.84705 17.3286 1.58795 17.0695 1.58795 16.7499C1.58795 16.4303 1.84705 16.1712 2.16666 16.1712H3.67128V14.6666C3.67128 14.347 3.93038 14.0879 4.24999 14.0879Z"
        fill="url(#paint0_linear_864_3172)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_864_3172"
          x1="10.5"
          y1="2.16659"
          x2="10.5"
          y2="18.8333"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#69AEFF" />
          <stop offset="0.432292" stopColor="#6096FF" />
          <stop offset="1" stopColor="#6C7FFF" />
        </linearGradient>
      </defs>
    </Icon>
  );
}

export default function useDetailDriver() {
  const { t, i18n } = useTranslation();
  const [reward, setReward] = useState(5);
  const { detailCompleted, setDetailCompleted } = useGuideStore();
  const { envs } = useSystemConfigStore();

  const [rechargeOptions, setRechargeOptions] = useState([
    { amount: 8, gift: 8 },
    { amount: 32, gift: 32 },
    { amount: 128, gift: 128 }
  ]);

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  const driverObj = driver({
    disableActiveInteraction: true,
    showProgress: false,
    allowClose: false,
    allowClickMaskNextStep: true,
    allowPreviousStep: false,
    isShowButtons: false,
    allowKeyboardControl: false,
    steps: [
      {
        popover: {
          borderRadius: '12px 12px 12px 12px',
          PopoverBody: (
            <Flex flexDirection={'column'} alignItems={'center'} padding={'27px 40px'} w="540px">
              <Flex
                w="100%"
                color={'#24282C'}
                fontSize={'14px'}
                fontWeight={500}
                bg="#F6EEFA"
                borderRadius={'8px'}
                p={'16px'}
                alignItems={'center'}
              >
                <DriverStarIcon />
                <Text fontWeight={500} ml="8px">
                  {t('you_have_successfully_deployed_app')}
                </Text>
                <Text
                  ml="auto"
                  mr={'12px'}
                  color={'grayModern.900'}
                  fontSize={'12px'}
                  fontWeight={500}
                >
                  {t('receive')}
                </Text>
                <CurrencySymbol type={envs?.CURRENCY_SYMBOL} />
                <Text mx="4px">{reward}</Text>
                <Text fontSize={'14px'} fontWeight={500}>
                  {t('balance')}
                </Text>
              </Flex>

              <Flex
                alignItems={'center'}
                justifyContent={'center'}
                color={'#24282C'}
                fontSize={'14px'}
                fontWeight={500}
                mt="42px"
              >
                <MyIcon name="gift" w={'20px'} h={'20px'} />
                <Text fontSize={'20px'} fontWeight={500} ml="8px" mr={'4px'}>
                  {t('first_charge')}
                </Text>
              </Flex>

              <Flex
                justifyContent={'center'}
                fontSize={i18n.language === 'en' ? '18px' : '24px'}
                fontWeight={500}
                mt="28px"
                gap={'16px'}
              >
                {rechargeOptions.map((item, index) => (
                  <Center
                    key={index}
                    bg="#F4F4F7"
                    borderRadius="2px"
                    w={'100px'}
                    h={'72px'}
                    position={'relative'}
                  >
                    <CurrencySymbol type={envs?.CURRENCY_SYMBOL} />
                    <Text fontSize={'20px'} fontWeight={500} color={'rgba(17, 24, 36, 1)'} pl="4px">
                      {item.amount}
                    </Text>
                    <Flex
                      bg={'#F7E7FF'}
                      position={'absolute'}
                      top={0}
                      right={'-15px'}
                      borderRadius={'10px 10px 10px 0px'}
                      color={'#9E53C1'}
                      fontSize={'12px'}
                      fontWeight={500}
                      gap={'2px'}
                      alignItems={'center'}
                      justifyContent={'center'}
                      w={'60px'}
                      height={'20px'}
                    >
                      <Text>{t('gift')}</Text>
                      <CurrencySymbol type={envs?.CURRENCY_SYMBOL} />
                      <Text>{item.gift}</Text>
                    </Flex>
                  </Center>
                ))}
              </Flex>

              <Flex
                mt={'40px'}
                bg={'#111824'}
                borderRadius={'6px'}
                alignItems={'center'}
                justifyContent={'center'}
                w={'179px'}
                h={'36px'}
                color={'#FFF'}
                fontSize={'14px'}
                fontWeight={500}
                cursor={'pointer'}
                onClick={() => {
                  driverObj.destroy();
                  openCostCenterApp();
                }}
              >
                {t('go_to_recharge')}
              </Flex>
              <Text
                mt="16px"
                cursor={'pointer'}
                color={'rgba(72, 82, 100, 1)'}
                fontSize={'14px'}
                fontWeight={500}
                onClick={() => {
                  driverObj.destroy();
                }}
              >
                {t('let_me_think_again')}
              </Text>
            </Flex>
          )
        }
      }
    ],
    onDestroyed: () => {
      console.log('onDestroyed Detail');
      setDetailCompleted(true);
      checkUserTask().then((err) => {
        console.log(err);
      });
    },
    interceptSkipButtonClick: () => {
      driverObj.destroy();
    }
  });

  const startGuide = () => {
    driverObj.drive();
  };

  useEffect(() => {
    const handleUserGuide = async () => {
      try {
        const [taskData, bonusData] = await Promise.all([getUserTasks(), getPriceBonus()]);
        if (taskData.needGuide && !detailCompleted) {
          setReward(formatMoney(Number(taskData.task.reward)));
          setRechargeOptions(bonusData);
          requestAnimationFrame(() => {
            startGuide();
          });
        }
      } catch (error) {
        console.log(error);
      }
    };
    handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startGuide };
}
