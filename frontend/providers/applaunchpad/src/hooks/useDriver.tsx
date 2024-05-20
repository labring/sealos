import { getInitData, getUserAccount, updateDesktopGuide } from '@/api/platform';
import { GUIDE_LAUNCHPAD_CREATE_KEY } from '@/constants/account';
import { Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

export function DriverStarIcon() {
  return (
    <Icon
      width="20px"
      height="20px"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.74999 1.08801C4.0696 1.08801 4.32869 1.34711 4.32869 1.66672V3.17135H5.83332C6.15293 3.17135 6.41203 3.43044 6.41203 3.75005C6.41203 4.06966 6.15293 4.32875 5.83332 4.32875H4.32869V5.83338C4.32869 6.15299 4.0696 6.41209 3.74999 6.41209C3.43038 6.41209 3.17128 6.15299 3.17128 5.83338V4.32875H1.66666C1.34705 4.32875 1.08795 4.06966 1.08795 3.75005C1.08795 3.43044 1.34705 3.17135 1.66666 3.17135H3.17128V1.66672C3.17128 1.34711 3.43038 1.08801 3.74999 1.08801ZM10.8333 1.92135C11.0728 1.92135 11.2875 2.06882 11.3735 2.29231L12.8186 6.04969C13.0643 6.68839 13.1548 6.91199 13.2853 7.0956C13.4098 7.27064 13.5627 7.42357 13.7378 7.54803C13.9214 7.67859 14.145 7.76912 14.7837 8.01477L18.5411 9.45992C18.7646 9.54588 18.912 9.7606 18.912 10C18.912 10.2395 18.7646 10.4542 18.5411 10.5402L14.7837 11.9853C14.145 12.231 13.9214 12.3215 13.7378 12.4521C13.5627 12.5765 13.4098 12.7295 13.2853 12.9045C13.1548 13.0881 13.0643 13.3117 12.8186 13.9504L11.3735 17.7078C11.2875 17.9313 11.0728 18.0788 10.8333 18.0788C10.5939 18.0788 10.3792 17.9313 10.2932 17.7078L8.84804 13.9504C8.60239 13.3117 8.51186 13.0881 8.3813 12.9045C8.25684 12.7295 8.10391 12.5765 7.92887 12.4521C7.74526 12.3215 7.52166 12.231 6.88297 11.9853L3.12558 10.5402C2.90209 10.4542 2.75462 10.2395 2.75462 10C2.75462 9.7606 2.90209 9.54588 3.12558 9.45992L6.88296 8.01477C7.52166 7.76912 7.74526 7.67859 7.92887 7.54803C8.10391 7.42357 8.25684 7.27064 8.3813 7.0956C8.51186 6.91199 8.60239 6.68839 8.84804 6.04969L10.2932 2.29231C10.3791 2.06882 10.5939 1.92135 10.8333 1.92135ZM10.8333 4.11213L9.9283 6.46518C9.91949 6.48809 9.9108 6.51071 9.90222 6.53303C9.69245 7.07888 9.55023 7.44893 9.32456 7.76631C9.12512 8.04679 8.88006 8.29185 8.59958 8.49129C8.28221 8.71696 7.91216 8.85917 7.36631 9.06895C7.34398 9.07753 7.32137 9.08622 7.29845 9.09503L4.9454 10L7.29845 10.9051C7.32137 10.9139 7.34398 10.9226 7.36631 10.9312C7.91216 11.1409 8.28221 11.2831 8.59958 11.5088C8.88006 11.7083 9.12512 11.9533 9.32456 12.2338C9.55023 12.5512 9.69245 12.9212 9.90222 13.4671C9.9108 13.4894 9.91949 13.512 9.9283 13.5349L10.8333 15.888L11.7383 13.5349C11.7472 13.512 11.7558 13.4894 11.7644 13.4671C11.9742 12.9212 12.1164 12.5512 12.3421 12.2338C12.5415 11.9533 12.7866 11.7083 13.0671 11.5088C13.3844 11.2831 13.7545 11.1409 14.3003 10.9311C14.3227 10.9226 14.3453 10.9139 14.3682 10.9051L16.7212 10L14.3682 9.09503C14.3453 9.08622 14.3227 9.07753 14.3004 9.06896C13.7545 8.85918 13.3844 8.71696 13.0671 8.49129C12.7866 8.29185 12.5415 8.04679 12.3421 7.76631C12.1164 7.44894 11.9742 7.07889 11.7644 6.53304C11.7558 6.51071 11.7472 6.4881 11.7383 6.46518L10.8333 4.11213ZM3.74999 13.588C4.0696 13.588 4.32869 13.8471 4.32869 14.1667V15.6713H5.83332C6.15293 15.6713 6.41203 15.9304 6.41203 16.25C6.41203 16.5697 6.15293 16.8288 5.83332 16.8288H4.32869V18.3334C4.32869 18.653 4.0696 18.9121 3.74999 18.9121C3.43038 18.9121 3.17128 18.653 3.17128 18.3334V16.8288H1.66666C1.34705 16.8288 1.08795 16.5697 1.08795 16.25C1.08795 15.9304 1.34705 15.6713 1.66666 15.6713H3.17128V14.1667C3.17128 13.8471 3.43038 13.588 3.74999 13.588Z"
        fill="url(#paint0_linear_124_3715)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_124_3715"
          x1="9.99999"
          y1="1.66672"
          x2="9.99999"
          y2="18.3334"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFC3A4" />
          <stop offset="0.432292" stopColor="#FE8BA7" />
          <stop offset="1" stopColor="#8695FF" />
        </linearGradient>
      </defs>
    </Icon>
  );
}

export default function useDriver() {
  const { t } = useTranslation();
  const [isGuided, setIsGuided] = useState(true);

  useEffect(() => {
    const handleUserGuide = async () => {
      try {
        const { guideEnabled } = await getInitData();
        const userAccount = await getUserAccount();
        if (guideEnabled && userAccount?.metadata?.annotations) {
          const isGuided = !!userAccount.metadata.annotations?.[GUIDE_LAUNCHPAD_CREATE_KEY];
          if (!isGuided) {
            startGuide();
          }
          setIsGuided(isGuided);
        }
      } catch (error) {
        console.log(error);
      }
    };
    handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGuideStatus = () => {
    updateDesktopGuide({
      activityType: 'beginner-guide',
      phase: 'launchpad',
      phasePage: 'create',
      shouldSendGift: false
    }).catch((err) => {
      console.log(err);
    });
  };

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

  const driverObj = driver({
    showProgress: false,
    allowClose: false,
    allowClickMaskNextStep: true,
    allowPreviousStep: false,
    isShowButtons: false,
    allowKeyboardControl: false,
    overlaySkipButton: t('skip') || 'skip',
    steps: [
      {
        element: '.driver-deploy-image',
        popover: {
          side: 'right',
          align: 'center',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('Can help you deploy any Docker image')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.driver-deploy-instance',
        popover: {
          side: 'top',
          align: 'start',
          borderRadius: '12px 12px 12px 0px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('Configurable number of instances or automatic horizontal scaling')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.driver-deploy-network-switch',
        popover: {
          side: 'top',
          align: 'start',
          borderRadius: '12px 12px 12px 0px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('Second-level domain name tips')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.driver-deploy-button',
        popover: {
          side: 'left',
          align: 'center',
          borderRadius: '12px 12px 0px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('Click the Deploy Application button')}
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
    ],
    onDestroyed: () => {
      updateGuideStatus();
    }
  });

  const startGuide = () => {
    driverObj.drive();
  };

  const closeGuide = () => {
    driverObj.destroy();
  };

  return { driverObj, startGuide, closeGuide, isGuided };
}
