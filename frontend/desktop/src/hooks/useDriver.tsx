import { getPriceBonus, getUserAccount, updateDesktopGuide } from '@/api/platform';
import { GUIDE_DESKTOP_INDEX_KEY } from '@/constants/account';
import { formatMoney } from '@/utils/format';
import { Box, Button, Flex, FlexProps, Icon, Image, Text } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/config';

export function DriverStarIcon() {
  return (
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="20px"
      height="20px"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.74999 1.08789C4.0696 1.08789 4.32869 1.34699 4.32869 1.66659V3.17122H5.83332C6.15293 3.17122 6.41203 3.43032 6.41203 3.74993C6.41203 4.06954 6.15293 4.32863 5.83332 4.32863H4.32869V5.83326C4.32869 6.15287 4.0696 6.41196 3.74999 6.41196C3.43038 6.41196 3.17128 6.15287 3.17128 5.83326V4.32863H1.66666C1.34705 4.32863 1.08795 4.06954 1.08795 3.74993C1.08795 3.43032 1.34705 3.17122 1.66666 3.17122H3.17128V1.66659C3.17128 1.34699 3.43038 1.08789 3.74999 1.08789ZM10.8333 1.92122C11.0728 1.92122 11.2875 2.06869 11.3735 2.29218L12.8186 6.04957C13.0643 6.68827 13.1548 6.91187 13.2853 7.09548C13.4098 7.27051 13.5627 7.42344 13.7378 7.54791C13.9214 7.67846 14.145 7.769 14.7837 8.01465L18.5411 9.4598C18.7646 9.54576 18.912 9.76048 18.912 9.99993C18.912 10.2394 18.7646 10.4541 18.5411 10.5401L14.7837 11.9852C14.145 12.2309 13.9214 12.3214 13.7378 12.4519C13.5627 12.5764 13.4098 12.7293 13.2853 12.9044C13.1548 13.088 13.0643 13.3116 12.8186 13.9503L11.3735 17.7077C11.2875 17.9312 11.0728 18.0786 10.8333 18.0786C10.5939 18.0786 10.3792 17.9312 10.2932 17.7077L8.84804 13.9503C8.60239 13.3116 8.51186 13.088 8.3813 12.9044C8.25684 12.7293 8.10391 12.5764 7.92887 12.4519C7.74526 12.3214 7.52166 12.2309 6.88297 11.9852L3.12558 10.5401C2.90209 10.4541 2.75462 10.2394 2.75462 9.99993C2.75462 9.76048 2.90209 9.54576 3.12558 9.4598L6.88296 8.01465C7.52166 7.769 7.74526 7.67846 7.92887 7.54791C8.10391 7.42345 8.25684 7.27051 8.3813 7.09548C8.51186 6.91187 8.60239 6.68827 8.84804 6.04957L10.2932 2.29219C10.3791 2.06869 10.5939 1.92122 10.8333 1.92122ZM10.8333 4.11201L9.9283 6.46506C9.91949 6.48797 9.9108 6.51059 9.90222 6.53291C9.69245 7.07876 9.55023 7.44881 9.32456 7.76619C9.12512 8.04667 8.88006 8.29173 8.59958 8.49117C8.28221 8.71684 7.91216 8.85905 7.36631 9.06883C7.34398 9.0774 7.32137 9.0861 7.29845 9.09491L4.9454 9.99993L7.29845 10.9049C7.32137 10.9138 7.34398 10.9225 7.36631 10.931C7.91216 11.1408 8.28221 11.283 8.59958 11.5087C8.88006 11.7081 9.12512 11.9532 9.32456 12.2337C9.55023 12.551 9.69245 12.9211 9.90222 13.4669C9.9108 13.4893 9.91949 13.5119 9.9283 13.5348L10.8333 15.8878L11.7383 13.5348C11.7472 13.5119 11.7558 13.4893 11.7644 13.467C11.9742 12.9211 12.1164 12.551 12.3421 12.2337C12.5415 11.9532 12.7866 11.7081 13.0671 11.5087C13.3844 11.283 13.7545 11.1408 14.3003 10.931C14.3227 10.9225 14.3453 10.9138 14.3682 10.9049L16.7212 9.99993L14.3682 9.09491C14.3453 9.0861 14.3227 9.07741 14.3004 9.06883C13.7545 8.85906 13.3844 8.71684 13.0671 8.49117C12.7866 8.29173 12.5415 8.04667 12.3421 7.76619C12.1164 7.44881 11.9742 7.07876 11.7644 6.53291C11.7558 6.51059 11.7472 6.48797 11.7383 6.46505L10.8333 4.11201ZM3.74999 13.5879C4.0696 13.5879 4.32869 13.847 4.32869 14.1666V15.6712H5.83332C6.15293 15.6712 6.41203 15.9303 6.41203 16.2499C6.41203 16.5695 6.15293 16.8286 5.83332 16.8286H4.32869V18.3333C4.32869 18.6529 4.0696 18.912 3.74999 18.912C3.43038 18.912 3.17128 18.6529 3.17128 18.3333V16.8286H1.66666C1.34705 16.8286 1.08795 16.5695 1.08795 16.2499C1.08795 15.9303 1.34705 15.6712 1.66666 15.6712H3.17128V14.1666C3.17128 13.847 3.43038 13.5879 3.74999 13.5879Z"
        fill="url(#paint0_linear_317_238)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_317_238"
          x1="9.99999"
          y1="1.66659"
          x2="9.99999"
          y2="18.3333"
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

export default function useDriver({ openDesktopApp }: { openDesktopApp: any }) {
  const { t, i18n } = useTranslation();
  const [showGuide, setShowGuide] = useState(false);
  const [giftAmount, setGiftAmount] = useState(8);
  const router = useRouter();

  const conf = useConfigStore().commonConfig;
  const handleSkipGuide = () => {
    setShowGuide(false);
    updateDesktopGuide().catch((err) => {
      console.log(err);
    });
  };

  useEffect(() => {
    const handleUserGuide = async () => {
      try {
        if (!conf?.guideEnabled) return;
        const { data } = await getUserAccount();
        const bonus = await getPriceBonus();
        if (bonus.data?.activities) {
          const strategy = JSON.parse(bonus.data?.activities);
          const rewardBalance = formatMoney(
            strategy?.['beginner-guide']?.phases?.launchpad?.giveAmount || 8000000
          );
          setGiftAmount(rewardBalance);
        }

        if (data?.metadata?.annotations && !router.query?.openapp) {
          const isGuidedDesktop = !!data.metadata.annotations?.[GUIDE_DESKTOP_INDEX_KEY];
          !isGuidedDesktop ? setShowGuide(true) : '';
        }
      } catch (error) {}
    };
    conf?.guideEnabled && handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conf]);

  const PopoverBodyInfo = (props: FlexProps) => (
    <Flex
      gap="4px"
      id="popover-info"
      position={'absolute'}
      bottom={'-30px'}
      color={'white'}
      alignItems={'center'}
      {...props}
    >
      <Text color={'#FFF'} fontSize={'13px'} fontWeight={500}>
        {t('common:click_on_any_shadow_to_skip')}
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

  const driverObj = driver({
    showProgress: false,
    allowClose: false,
    allowClickMaskNextStep: true,
    allowPreviousStep: true,
    isShowButtons: false,
    allowKeyboardControl: false,
    disableActiveInteraction: true,
    steps: [
      {
        element: '.floatButtonNav',
        popover: {
          side: 'left',
          align: 'center',
          borderRadius: '12px 12px 0px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('common:quick_application_switching_floating_ball')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-terminal',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('common:you_can_use_the_kubectl_command_directly_from_the_terminal')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-dbprovider',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('common:help_you_enable_high_availability_database')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-template',
        popover: {
          side: 'left',
          align: 'center',
          borderRadius: '12px 12px 0px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('common:launch_various_third-party_applications_with_one_click')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.system-costcenter',
        popover: {
          side: 'top',
          align: 'start',
          borderRadius: '12px 12px 12px 0px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'}>
                {t('common:you_can_view_fees_through_the_fee_center')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.system-applaunchpad',
        popover: {
          side: 'left',
          align: 'start',
          borderRadius: '12px 0px 12px 12px',
          onPopoverRender: () => {
            const svg = driverObj.getState('__overlaySvg');
            if (svg) {
              const pathElement = svg.querySelector('path');
              if (pathElement) {
                pathElement.style.pointerEvents = 'none';
              }
            }
          },
          PopoverBody: (
            <Box color={'#24282C'} padding={'10px'}>
              <Flex gap={'6px'}>
                <DriverStarIcon />
                <Text fontSize={'16px'} fontWeight={'600'}>
                  {t('common:deploy_an_application')}
                </Text>
              </Flex>
              <Box fontSize={'13px'} fontWeight={500} mt="12px">
                {t('common:spend')}
                <Text color={'#219BF4'} display={'inline'} px="2px">
                  30s
                </Text>
                {t('common:completed_the_deployment_of_an_nginx_for_the_first_time')}
                <Text color={'#219BF4'} display={'inline'} px="2px">
                  {t('common:gift_amount', { amount: giftAmount })}
                </Text>
              </Box>
              <Flex mt="20px">
                <Button
                  color={'#24282C'}
                  fontSize={'12px'}
                  p="4px 16px"
                  border={'1px solid #DEE0E2'}
                  bg="#FFF"
                  ml="auto"
                  borderRadius={'4px'}
                  cursor={'pointer'}
                  onClick={() => {
                    driverObj.destroy();
                  }}
                >
                  {t('common:next_time')}
                </Button>
                <Button
                  ml="12px"
                  color={'#FEFEFE'}
                  fontSize={'12px'}
                  p="4px 16px"
                  bg="#000"
                  borderRadius={'4px'}
                  cursor={'pointer'}
                  onClick={() => {
                    driverObj.destroy();
                    openDesktopApp({ appKey: 'system-applaunchpad', pathname: '/app/edit' });
                  }}
                >
                  {t('common:start_immediately')}
                </Button>
              </Flex>
            </Box>
          )
        }
      }
    ],
    onDestroyed: () => {
      console.log('onDestroyed');
      handleSkipGuide();
    }
  });

  const startGuide = () => {
    setShowGuide(false);
    driverObj.drive();
  };

  const UserGuide = () => (
    <Box
      zIndex={11100}
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      bg={'linear-gradient(180deg, #FFFDFD 9.04%, #F6F7FE 46.15%, #FAFAFF 87.5%)'}
      borderRadius={'12px'}
    >
      <Image src="/images/driver-bg.png" alt="driver" draggable="false" userSelect={'none'} />
      <Flex
        flexDirection={'column'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'absolute'}
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
      >
        <Box fontSize={'32px'} fontWeight={500}>
          {t('common:hello_welcome')}
          <Text display={'inline'} color={'#0884DD'} px="8px">
            Sealos
          </Text>
          👏
        </Box>
        <Button
          w="206px"
          mt="46px"
          variant={'primary'}
          bg="#121416"
          rightIcon={
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="16px"
              height="16px"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3.33331 8.00001H12.6666M12.6666 8.00001L7.99998 3.33334M12.6666 8.00001L7.99998 12.6667"
                stroke="white"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Icon>
          }
          onClick={() => {
            startGuide();
          }}
        >
          {t('common:start_your_sealos_journey')}
        </Button>
      </Flex>
    </Box>
  );

  return { UserGuide, showGuide, startGuide };
}
