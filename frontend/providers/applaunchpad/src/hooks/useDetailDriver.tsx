import { getInitData, getPriceBonus, getUserAccount, updateDesktopGuide } from '@/api/platform';
import { GUIDE_LAUNCHPAD_DETAIL_KEY, GUIDE_LAUNCHPAD_GIFT_KEY } from '@/constants/account';
import { formatMoney } from '@/utils/tools';
import { Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { DriveStep, driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { DriverStarIcon } from './useDriver';

export default function useDriver() {
  const { t, i18n } = useTranslation();
  const [showGiftStep, setShowGiftStep] = useState(false);
  const [activity, setActivity] = useState({
    balance: 8,
    limitDuration: '1',
    amount: '8',
    giftAmount: '8'
  });

  const PopoverBodyInfo = (props: FlexProps) => {
    return (
      <Flex
        gap="4px"
        id="popover-info"
        position={'absolute'}
        bottom={'-30px'}
        color={'white'}
        alignItems={'center'}
        {...props}
      >
        <Text color={'#FFF'} fontSize={'12px'} fontWeight={500}>
          {t('Click on any shadow to skip')}
        </Text>
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="white"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.50001 0.97229C7.88354 0.97229 8.19445 1.2832 8.19445 1.66673V2.91673C8.19445 3.30027 7.88354 3.61118 7.50001 3.61118C7.11648 3.61118 6.80556 3.30027 6.80556 2.91673V1.66673C6.80556 1.2832 7.11648 0.97229 7.50001 0.97229ZM2.84229 2.84235C3.11349 2.57116 3.55319 2.57116 3.82439 2.84235L4.70827 3.72624C4.97947 3.99744 4.97947 4.43713 4.70827 4.70833C4.43707 4.97953 3.99737 4.97953 3.72618 4.70833L2.84229 3.82445C2.5711 3.55325 2.5711 3.11355 2.84229 2.84235ZM12.2083 2.84235C12.4795 3.11355 12.4795 3.55325 12.2083 3.82445L11.3244 4.70833C11.0532 4.97953 10.6135 4.97953 10.3423 4.70833C10.0711 4.43713 10.0711 3.99744 10.3423 3.72624L11.2262 2.84235C11.4974 2.57116 11.9371 2.57116 12.2083 2.84235ZM8.05107 6.36654C8.05921 6.36904 8.06735 6.37155 8.07548 6.37406L17.4584 9.26437C17.6747 9.33097 17.8794 9.394 18.0383 9.45881C18.183 9.51788 18.4465 9.63567 18.6129 9.8969C18.8034 10.1959 18.8398 10.5678 18.7109 10.8981C18.5983 11.1866 18.3627 11.3532 18.2321 11.4393C18.0888 11.5336 17.9002 11.6352 17.7009 11.7425L13.8279 13.828L11.7424 17.701C11.6351 17.9003 11.5336 18.0889 11.4392 18.2322C11.3531 18.3628 11.1865 18.5984 10.898 18.711C10.5677 18.8399 10.1958 18.8035 9.8968 18.613C9.63557 18.4466 9.51779 18.1831 9.45872 18.0384C9.39391 17.8795 9.33088 17.6748 9.26429 17.4586L6.37399 8.07554C6.37148 8.0674 6.36897 8.05926 6.36647 8.05112C6.31285 7.87717 6.25951 7.70409 6.2288 7.55823C6.19822 7.413 6.15971 7.17003 6.25365 6.91402C6.36609 6.60762 6.60756 6.36615 6.91396 6.25371C7.16997 6.15977 7.41294 6.19829 7.55817 6.22886C7.70404 6.25957 7.87712 6.31292 8.05107 6.36654ZM7.71679 7.71686L10.564 16.9599L12.609 13.1621C12.6112 13.158 12.6136 13.1535 12.6162 13.1486C12.6422 13.0999 12.6884 13.0133 12.7511 12.9339C12.8047 12.8661 12.866 12.8048 12.9339 12.7512C13.0132 12.6884 13.0999 12.6422 13.1485 12.6163C13.1535 12.6137 13.158 12.6112 13.1621 12.609L16.9598 10.5641L7.71679 7.71686ZM0.972229 7.50007C0.972229 7.11654 1.28314 6.80562 1.66667 6.80562H2.91667C3.3002 6.80562 3.61112 7.11654 3.61112 7.50007C3.61112 7.8836 3.3002 8.19451 2.91667 8.19451H1.66667C1.28314 8.19451 0.972229 7.8836 0.972229 7.50007ZM4.70827 10.3424C4.97947 10.6136 4.97947 11.0532 4.70827 11.3244L3.82439 12.2083C3.55319 12.4795 3.11349 12.4795 2.84229 12.2083C2.5711 11.9371 2.5711 11.4974 2.84229 11.2262L3.72618 10.3424C3.99737 10.0712 4.43707 10.0712 4.70827 10.3424Z"
          />
        </Icon>
      </Flex>
    );
  };

  const baseSteps: DriveStep[] = [
    {
      element: '.driver-detail-network-public',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 0px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'}>
              {t('Click here to visit the website')}
            </Text>
            <PopoverBodyInfo top={'-120px'} />
          </Flex>
        )
      }
    },
    {
      element: '.driver-detail-terminal',
      popover: {
        side: 'left',
        align: 'center',
        borderRadius: '12px 12px 0px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'}>
              {t('You can enter the container through the terminal')}
            </Text>
            <PopoverBodyInfo top={'-120px'} />
          </Flex>
        )
      }
    },
    {
      element: '.driver-detail-update-button',
      popover: {
        side: 'bottom',
        align: 'start',
        borderRadius: '12px 12px 0px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'}>
              {t('Adjust application configuration')}
            </Text>
            <PopoverBodyInfo top={'80px'} />
          </Flex>
        )
      }
    }
  ];

  const giftStep: DriveStep[] = [
    {
      popover: {
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <Flex flexDirection={'column'} alignItems={'center'} padding={'27px 40px'} w="450px">
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
              <Text ml="8px">{t('You have successfully deployed an application')}</Text>
              <Text color={'#5A646E'} fontSize={'12px '} fontWeight={500} ml="auto">
                {t('receive')}
              </Text>
              <Text ml="12px">{activity.balance}</Text>
              <Icon w="16px" h={'16px'} viewBox="0 0 43 43" mx="4px">
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M38.8452 16.3383C38.8452 16.3383 38.169 13.0791 34.6177 12.5018C34.6177 12.5018 32.91 5.22138 26.476 8.01336C26.476 8.01336 21.7775 1.34481 16.7833 8.01336C16.7833 8.01336 10.8267 4.86984 8.35511 12.513C8.35511 12.513 4.03522 12.6233 4.00011 18.5272C3.96499 24.4311 12.4728 30.8168 13.6867 31.3741C13.6867 31.3741 11.0158 34.2719 14.2876 36.284C18.8172 38.6577 27.3756 37.7936 29.4606 35.9326C30.7532 34.7789 30.6523 33.0064 29.4606 31.5498C29.4556 31.5548 40.4202 25.1038 38.8452 16.3383ZM31.6228 11.4841C29.9736 8.80397 26.7453 10.5751 26.7453 10.5751C27.9505 20.3212 24.1256 29.8479 24.1256 29.8479C27.7512 28.7132 33.6121 14.7169 31.6228 11.4841ZM21.1951 7.66792C21.1951 7.66792 18.5641 7.83387 18.1203 11.4413C17.6764 15.0488 18.7299 29.0557 21.5427 30.0673C21.5427 30.0673 23.5266 30.5865 24.8902 18.319C26.6924 6.40218 21.1951 7.66792 21.1951 7.66792ZM16.2936 10.5751C16.2936 10.5751 13.488 8.61467 11.4786 11.4841C9.49465 14.7169 15.3556 28.7132 18.9759 29.8479C18.9759 29.8479 15.2143 21.3388 16.2936 10.5751ZM8.87726 14.9454C8.87726 14.9454 6.13705 14.9454 6.43049 18.7633C6.79949 23.5643 12.9309 28.6588 15.2143 29.5044C15.2089 29.5044 10.0763 22.326 8.87726 14.9454ZM15.1097 34.6383C15.8744 35.9813 24.6742 36.3866 28.102 34.8719C28.102 34.8719 29.1783 33.7787 27.532 31.5994C27.4731 31.5216 26.8769 31.5791 26.5874 31.5627C26.2978 31.5463 26.0133 31.4758 25.6763 31.4068C25.6763 31.4068 24.6168 32.1662 22.9437 31.5994C22.9437 31.5994 21.7614 32.2601 20.3823 31.5994C20.3823 31.5994 18.6756 32.1821 17.6497 31.4068C17.6497 31.4068 16.9291 31.6032 15.8719 31.4068C15.8719 31.4068 14.3671 33.3342 15.1097 34.6383ZM34.2051 14.9533C32.8914 23.1395 27.9505 29.5113 27.9505 29.5113C30.9382 28.8784 36.0244 22.5811 36.6816 18.7633C37.3388 14.9454 34.2051 14.9533 34.2051 14.9533Z"
                />
              </Icon>
              <Text>{t('Balance')}</Text>
            </Flex>
            <Flex
              alignItems={'center'}
              justifyContent={'center'}
              color={'#24282C'}
              fontSize={'14px'}
              fontWeight={500}
              mt="42px"
            >
              <Icon
                xmlns="http://www.w3.org/2000/svg"
                width="16px"
                height="16px"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_45_25863)">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.99984 1.99984C4.73462 1.99984 4.48027 2.10519 4.29273 2.29273C4.10519 2.48027 3.99984 2.73462 3.99984 2.99984C3.99984 3.26505 4.10519 3.51941 4.29273 3.70694C4.48027 3.89448 4.73462 3.99984 4.99984 3.99984H7.10252C7.02114 3.78691 6.91811 3.55278 6.79069 3.32112C6.37138 2.55873 5.79577 1.99984 4.99984 1.99984ZM7.33317 5.33317V8.6665H1.99984V6.79984C1.99984 6.41547 2.00036 6.16729 2.01579 5.97839C2.03059 5.79729 2.05571 5.73014 2.0725 5.69718C2.13642 5.57174 2.2384 5.46975 2.36384 5.40583C2.39681 5.38904 2.46395 5.36392 2.64506 5.34912C2.83395 5.33369 3.08214 5.33317 3.46651 5.33317H7.33317ZM2.89338 4.00348C2.74541 3.69289 2.6665 3.35043 2.6665 2.99984C2.6665 2.381 2.91234 1.78751 3.34992 1.34992C3.78751 0.912337 4.381 0.666504 4.99984 0.666504C6.53724 0.666504 7.46163 1.77427 7.95898 2.67856C7.97285 2.70377 7.98646 2.72896 7.99984 2.75411C8.01321 2.72896 8.02683 2.70377 8.04069 2.67856C8.53805 1.77427 9.46244 0.666504 10.9998 0.666504C11.6187 0.666504 12.2122 0.912337 12.6498 1.34992C13.0873 1.78751 13.3332 2.381 13.3332 2.99984C13.3332 3.35043 13.2543 3.69289 13.1063 4.00348C13.2351 4.0063 13.3543 4.01132 13.4632 4.02022C13.7268 4.04175 13.9889 4.0893 14.2412 4.21783C14.6175 4.40957 14.9234 4.71553 15.1152 5.09186C15.2437 5.34411 15.2913 5.60626 15.3128 5.86982C15.3332 6.11953 15.3332 6.4227 15.3332 6.77413V12.5589C15.3332 12.9103 15.3332 13.2135 15.3128 13.4632C15.2913 13.7268 15.2437 13.9889 15.1152 14.2411C14.9234 14.6175 14.6175 14.9234 14.2412 15.1152C13.9889 15.2437 13.7268 15.2913 13.4632 15.3128C13.2135 15.3332 12.9103 15.3332 12.5588 15.3332H7.99984L3.44079 15.3332C3.08937 15.3332 2.7862 15.3332 2.53649 15.3128C2.27292 15.2913 2.01078 15.2437 1.75852 15.1152C1.3822 14.9234 1.07624 14.6175 0.884492 14.2411C0.755963 13.9889 0.708419 13.7268 0.686885 13.4632C0.666482 13.2135 0.666493 12.9103 0.666504 12.5589L0.666505 9.33357L0.666505 6.77414C0.666493 6.42271 0.666482 6.11953 0.686885 5.86982C0.708419 5.60626 0.755963 5.34411 0.884492 5.09186C1.07624 4.71553 1.3822 4.40957 1.75852 4.21782C2.01078 4.08929 2.27292 4.04175 2.53649 4.02022C2.64542 4.01132 2.76453 4.0063 2.89338 4.00348ZM1.99984 9.99984L1.99984 12.5332C1.99984 12.9175 2.00036 13.1657 2.01579 13.3546C2.03059 13.5357 2.05571 13.6029 2.0725 13.6358C2.13642 13.7613 2.2384 13.8633 2.36384 13.9272C2.39681 13.944 2.46395 13.9691 2.64506 13.9839C2.83395 13.9993 3.08214 13.9998 3.4665 13.9998H7.33317V9.99984H1.99984ZM8.6665 9.99984V13.9998H12.5332C12.9175 13.9998 13.1657 13.9993 13.3546 13.9839C13.5357 13.9691 13.6029 13.944 13.6358 13.9272C13.7613 13.8633 13.8633 13.7613 13.9272 13.6358C13.944 13.6029 13.9691 13.5357 13.9839 13.3546C13.9993 13.1657 13.9998 12.9175 13.9998 12.5332V9.99984H8.6665ZM13.9998 8.6665V6.79984C13.9998 6.41547 13.9993 6.16729 13.9839 5.97839C13.9691 5.79729 13.944 5.73014 13.9272 5.69718C13.8633 5.57174 13.7613 5.46975 13.6358 5.40583C13.6029 5.38904 13.5357 5.36392 13.3546 5.34912C13.1657 5.33369 12.9175 5.33317 12.5332 5.33317L8.6665 5.33317V8.6665H13.9998ZM8.89716 3.99984C8.97854 3.78691 9.08157 3.55278 9.20898 3.32112C9.62829 2.55873 10.2039 1.99984 10.9998 1.99984C11.2651 1.99984 11.5194 2.10519 11.7069 2.29273C11.8945 2.48027 11.9998 2.73462 11.9998 2.99984C11.9998 3.26505 11.8945 3.51941 11.7069 3.70694C11.5194 3.89448 11.2651 3.99984 10.9998 3.99984H8.89716Z"
                    fill="url(#paint0_linear_45_25863)"
                  />
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_45_25863"
                    x1="7.99984"
                    y1="0.666504"
                    x2="7.99984"
                    y2="15.3332"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FFC3A4" />
                    <stop offset="0.432292" stopColor="#FE8BA7" />
                    <stop offset="1" stopColor="#8695FF" />
                  </linearGradient>
                  <clipPath id="clip0_45_25863">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </Icon>
              <Text ml="8px">{t('First time completion guide benefits')}</Text>
            </Flex>
            <Flex
              justifyContent={'center'}
              fontSize={i18n.language === 'en' ? '18px' : '24px'}
              fontWeight={500}
              mt="16px"
            >
              <Text color={'#24282C'} pr="4px">
                {t('gift time tip', { time: activity.limitDuration })}
              </Text>
              <Text color={'#219BF4'}>
                {t('gift amount tip', {
                  amount: activity.amount,
                  gift: activity.giftAmount
                })}
              </Text>
            </Flex>
            <Flex
              mt={'32px'}
              bg="#24282C"
              borderRadius={'4px'}
              alignItems={'center'}
              justifyContent={'center'}
              w={'179px'}
              h={'36px'}
              color={'#FFF'}
              fontSize={'12px'}
              fontWeight={500}
              cursor={'pointer'}
              onClick={() => {
                console.log('充值');
                driverObj.destroy();
                openCostCenterApp();
              }}
            >
              {t('Go to recharge')}
            </Flex>
            <Text
              mt="16px"
              cursor={'pointer'}
              color={'#7B838B'}
              fontSize={'12px'}
              fontWeight={500}
              onClick={() => {
                driverObj.destroy();
              }}
            >
              {t('let me think again')}
            </Text>
          </Flex>
        ),
        onPopoverRender: () => {
          const svg = driverObj.getState('__overlaySvg');
          if (svg) {
            const pathElement = svg.querySelector('path');
            if (pathElement) {
              pathElement.style.pointerEvents = 'none';
            }
          }
        }
      }
    }
  ];

  const driverConfig = useMemo(() => {
    return {
      disableActiveInteraction: true,
      showProgress: false,
      allowClose: false,
      allowClickMaskNextStep: true,
      allowPreviousStep: false,
      isShowButtons: false,
      allowKeyboardControl: false,
      overlaySkipButton: t('skip') || 'skip',
      steps: showGiftStep ? [...baseSteps, ...giftStep] : baseSteps,
      onDestroyed: () => {
        console.log('onDestroyed Detail');
        updateGuideStatus();
      },
      interceptSkipButtonClick: () => {
        const skipButton = driverObj.getState('__overlaySkipBtn');
        skipButton?.remove();
        if (driverObj.isLastStep()) {
          driverObj.destroy();
        } else {
          driverObj.drive(3);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGiftStep]);

  const driverObj = driver(driverConfig);

  const openCostCenterApp = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      query: {
        openRecharge: 'true'
      }
    });
  };

  const updateGuideStatus = () => {
    updateDesktopGuide({
      activityType: 'beginner-guide',
      phase: 'launchpad',
      phasePage: 'detail',
      shouldSendGift: false
    }).catch((err) => {
      console.log(err);
    });
  };

  useEffect(() => {
    const handleUserGuide = async () => {
      try {
        const { guideEnabled } = await getInitData();
        const userAccount = await getUserAccount();

        const bonus = await getPriceBonus();
        if (bonus?.data?.activities) {
          const strategy = JSON.parse(bonus.data?.activities);
          const activity = {
            balance: formatMoney(
              strategy?.['beginner-guide']?.phases?.launchpad?.giveAmount || 8000000
            ),
            limitDuration: strategy?.[
              'beginner-guide'
            ]?.phases?.launchpad?.RechargeDiscount?.limitDuration?.replace('h', ''),
            amount: Object.entries(
              strategy?.['beginner-guide']?.phases?.launchpad?.RechargeDiscount?.specialDiscount
            )[0][0],
            giftAmount:
              Object.entries(
                strategy?.['beginner-guide']?.phases?.launchpad?.RechargeDiscount?.specialDiscount
              )[0][1] + ''
          };
          setActivity(activity);
        }

        if (guideEnabled && userAccount?.metadata?.annotations) {
          const showGiftStep = !!userAccount.metadata.annotations?.[GUIDE_LAUNCHPAD_GIFT_KEY];
          const isGuided = !!userAccount.metadata.annotations?.[GUIDE_LAUNCHPAD_DETAIL_KEY];
          if (!isGuided) {
            setShowGiftStep(showGiftStep);
            startGuide();
          }
        }
      } catch (error) {
        console.log(error);
      }
    };
    handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGuide = () => {
    driverObj.drive();
  };

  const closeGuide = () => {
    driverObj.destroy();
  };

  return { startGuide, closeGuide };
}
