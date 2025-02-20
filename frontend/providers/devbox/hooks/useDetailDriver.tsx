import { useGuideStore } from '@/stores/guide';
import { Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { DriveStep, driver } from '@sealos/driver';
import { useTranslations } from 'next-intl';
import { DriverStarIcon } from './useDriver';
import { checkUserTask } from '@/api/platform';

export default function useDetailDriver() {
  const t = useTranslations();
  const { detailCompleted, setDetailCompleted, isGuideEnabled } = useGuideStore();

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
          {t('guide.click_shadow_skip')}
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
      element: '.guide-close-button',
      popover: {
        side: 'bottom',
        align: 'start',
        borderRadius: '0px 12px 12px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'} fontWeight={500}>
              {t('guide.devbox_close_button')}
            </Text>
            <PopoverBodyInfo />
          </Flex>
        )
      }
    },
    {
      element: '.guide-network-address',
      popover: {
        side: 'bottom',
        align: 'start',
        borderRadius: '0px 12px 12px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'} fontWeight={500}>
              {t('guide.devbox_network_address')}
            </Text>
            <PopoverBodyInfo top={'80px'} />
          </Flex>
        )
      }
    },
    {
      element: '.guide-release-button',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 0px 12px',
        PopoverBody: (
          <Flex gap={'6px'}>
            <DriverStarIcon />
            <Text color={'#24282C'} fontSize={'12px'} fontWeight={500}>
              {t('guide.devbox_release_button')}
            </Text>
            <PopoverBodyInfo top={'-120px'} />
          </Flex>
        )
      }
    }
  ];

  const handleUserGuide = async () => {
    try {
      if (isGuideEnabled && !detailCompleted) {
        const driverObj = driver({
          disableActiveInteraction: true,
          showProgress: false,
          allowClose: false,
          allowClickMaskNextStep: true,
          allowPreviousStep: false,
          isShowButtons: false,
          allowKeyboardControl: false,
          overlaySkipButton: t('skip') || 'skip',
          steps: baseSteps,
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

        requestAnimationFrame(() => {
          driverObj.drive();
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return { handleUserGuide };
}
