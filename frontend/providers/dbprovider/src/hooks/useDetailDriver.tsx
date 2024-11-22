import { checkUserTask, getPriceBonus, getUserTasks } from '@/api/platform';
import MyIcon from '@/components/Icon';
import { useGuideStore } from '@/store/guide';
import { formatMoney } from '@/utils/tools';
import { Center, Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { DriverStarIcon } from './useDriver';

export default function useDetailDriver() {
  const { t, i18n } = useTranslation();
  const [reward, setReward] = useState(5);
  const { detailCompleted, setDetailCompleted } = useGuideStore();

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
    disableActiveInteraction: true,
    showProgress: false,
    allowClose: false,
    allowClickMaskNextStep: true,
    allowPreviousStep: false,
    isShowButtons: false,
    allowKeyboardControl: false,
    steps: [
      {
        element: '.driver-detail-terminal-button',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'12px'} fontWeight={500}>
                {t('guide_terminal_button')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      }
      // {
      //   popover: {
      //     borderRadius: '12px 12px 12px 12px',
      //     PopoverBody: (
      //       <Flex flexDirection={'column'} alignItems={'center'} padding={'27px 40px'} w="540px">
      //         <Flex
      //           w="100%"
      //           color={'#24282C'}
      //           fontSize={'14px'}
      //           fontWeight={500}
      //           bg="#F6EEFA"
      //           borderRadius={'8px'}
      //           p={'16px'}
      //           alignItems={'center'}
      //         >
      //           <DriverStarIcon />
      //           <Text fontWeight={500} ml="8px">
      //             {t('you_have_successfully_deployed_database')}
      //           </Text>
      //           <Text
      //             ml="auto"
      //             mr={'12px'}
      //             color={'grayModern.900'}
      //             fontSize={'12px'}
      //             fontWeight={500}
      //           >
      //             {t('receive')}
      //           </Text>
      //           <Text mx="4px">{reward}</Text>
      //           <Text fontSize={'14px'} fontWeight={500}>
      //             {t('balance')}
      //           </Text>
      //         </Flex>

      //         <Flex
      //           alignItems={'center'}
      //           justifyContent={'center'}
      //           color={'#24282C'}
      //           fontSize={'14px'}
      //           fontWeight={500}
      //           mt="42px"
      //         >
      //           <MyIcon name="gift" w={'20px'} h={'20px'} />
      //           <Text fontSize={'20px'} fontWeight={500} ml="8px" mr={'4px'}>
      //             {t('first_charge')}
      //           </Text>
      //         </Flex>

      //         <Flex
      //           justifyContent={'center'}
      //           fontSize={i18n.language === 'en' ? '18px' : '24px'}
      //           fontWeight={500}
      //           mt="28px"
      //           gap={'16px'}
      //         >
      //           {rechargeOptions.map((item, index) => (
      //             <Center
      //               key={index}
      //               bg="#F4F4F7"
      //               borderRadius="2px"
      //               w={'100px'}
      //               h={'72px'}
      //               position={'relative'}
      //             >
      //               <Text fontSize={'20px'} fontWeight={500} color={'rgba(17, 24, 36, 1)'} pl="4px">
      //                 {item.amount}
      //               </Text>
      //               <Flex
      //                 bg={'#F7E7FF'}
      //                 position={'absolute'}
      //                 top={0}
      //                 right={'-15px'}
      //                 borderRadius={'10px 10px 10px 0px'}
      //                 color={'#9E53C1'}
      //                 fontSize={'12px'}
      //                 fontWeight={500}
      //                 gap={'2px'}
      //                 alignItems={'center'}
      //                 justifyContent={'center'}
      //                 w={'60px'}
      //                 height={'20px'}
      //               >
      //                 <Text>{t('gift')}</Text>
      //                 <Text>{item.gift}</Text>
      //               </Flex>
      //             </Center>
      //           ))}
      //         </Flex>

      //         <Flex
      //           mt={'40px'}
      //           bg={'#111824'}
      //           borderRadius={'6px'}
      //           alignItems={'center'}
      //           justifyContent={'center'}
      //           w={'179px'}
      //           h={'36px'}
      //           color={'#FFF'}
      //           fontSize={'14px'}
      //           fontWeight={500}
      //           cursor={'pointer'}
      //           onClick={() => {
      //             driverObj.destroy();
      //             openCostCenterApp();
      //           }}
      //         >
      //           {t('go_to_recharge')}
      //         </Flex>
      //         <Text
      //           mt="16px"
      //           cursor={'pointer'}
      //           color={'rgba(72, 82, 100, 1)'}
      //           fontSize={'14px'}
      //           fontWeight={500}
      //           onClick={() => {
      //             driverObj.destroy();
      //           }}
      //         >
      //           {t('let_me_think_again')}
      //         </Text>
      //       </Flex>
      //     )
      //   }
      // }
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
    // hide guide
    // handleUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startGuide };
}
