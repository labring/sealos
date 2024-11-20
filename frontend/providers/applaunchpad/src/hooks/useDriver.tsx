import { getUserTasks } from '@/api/platform';
import { useGuideStore } from '@/store/guide';
import { formatMoney } from '@/utils/tools';
import { Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';

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

export default function useDriver({
  setIsAdvancedOpen
}: {
  setIsAdvancedOpen: (val: boolean) => void;
}) {
  const { t } = useTranslation();
  const [isGuided, setIsGuided] = useState(false);
  const { createCompleted, setCreateCompleted } = useGuideStore();
  const [reward, setReward] = useState(1);

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
    disableActiveInteraction: true,
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
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('Can help you deploy any Docker image')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.driver-deploy-command',
        popover: {
          side: 'right',
          align: 'center',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('guide_deploy_command')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.driver-deploy-storage',
        popover: {
          side: 'top',
          align: 'start',
          borderRadius: '12px 12px 12px 0px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('guide_deploy_storage')}
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
            <Flex gap={'6px'} alignItems={'center'} fontSize={'13px'} fontWeight={500}>
              <DriverStarIcon />
              <Text color={'#24282C'}>{t('guide_deploy_button')}</Text>
            </Flex>
          )
        }
      }
    ],
    onDestroyed: () => {
      setCreateCompleted(true);
    }
  });

  const startGuide = useCallback(() => {
    driverObj.drive();
  }, [driverObj]);

  const closeGuide = () => {
    driverObj.destroy();
  };

  useEffect(() => {
    const handleUserGuide = async () => {
      try {
        const data = await getUserTasks();
        if (data.needGuide && !createCompleted) {
          setReward(formatMoney(Number(data.task.reward)));
          setIsAdvancedOpen(true);
          setIsGuided(true);
          requestAnimationFrame(() => {
            startGuide();
          });
        }
      } catch (error) {
        setIsGuided(false);
      }
    };
    handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startGuide, closeGuide, isGuided };
}
