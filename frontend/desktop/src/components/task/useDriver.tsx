import { checkUserTask, getUserTasks, updateTask } from '@/api/platform';
import { AppStoreIcon, DBproviderIcon, DriverStarIcon, LaunchpadIcon } from '@/components/icons';
import useAppStore from '@/stores/app';
import useCallbackStore from '@/stores/callback';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { UserTask } from '@/types/task';
import { Box, Button, Flex, FlexProps, Icon, Image, Text, useMediaQuery } from '@chakra-ui/react';
import { driver } from '@sealos/driver';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

export default function useDriver() {
  const { t } = useTranslation();
  const [desktopGuide, setDesktopGuide] = useState(false);
  const { layoutConfig } = useConfigStore();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [isPC] = useMediaQuery('(min-width: 768px)', {
    ssr: true,
    fallback: false // return false on the server, and re-evaluate on the client side
  });
  const conf = useConfigStore().commonConfig;
  const { taskComponentState, setTaskComponentState } = useDesktopConfigStore();
  const { canShowGuide } = useDesktopConfigStore();
  const { installedApps } = useAppStore();
  const { workspaceInviteCode } = useCallbackStore();

  useEffect(() => {
    const fetchUserTasks = async () => {
      await checkUserTask();
      const data = await getUserTasks();
      const filteredTasks = data.data.filter((task) => task.isNewUserTask);
      setTasks(filteredTasks);
    };
    fetchUserTasks();
  }, [taskComponentState]);

  useEffect(() => {
    const handleUserGuide = async () => {
      const data = await getUserTasks();
      const filteredTasks = data.data.filter((task) => task.isNewUserTask);
      setTasks(filteredTasks);
      const desktopTask = filteredTasks.find((task) => task.taskType === 'DESKTOP');
      const allTasksCompleted = filteredTasks.every((task) => task.isCompleted);

      if (!desktopTask?.isCompleted && desktopTask?.id) {
        setTaskComponentState('none');
        driverObj.drive();
      } else if (allTasksCompleted) {
        setTaskComponentState('none');
      } else {
        setTaskComponentState(taskComponentState !== 'none' ? taskComponentState : 'button');
      }
    };

    if (isPC && conf?.guideEnabled && canShowGuide && !workspaceInviteCode) {
      handleUserGuide();
    } else {
      setDesktopGuide(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conf?.guideEnabled, isPC, canShowGuide, workspaceInviteCode]);

  const completeGuide = async () => {
    try {
      if (!tasks.length) return;
      setDesktopGuide(false);
      const desktopTask = tasks.find((task) => task.taskType === 'DESKTOP');
      if (desktopTask) {
        await updateTask(desktopTask.id);
        setTaskComponentState('modal');
      }
    } catch (error) {}
  };

  const handleCloseTaskModal = () => {
    setTaskComponentState('button');
  };

  const checkAllTasksCompleted = () => {
    const allCompleted = tasks.every((task) => task.isCompleted);
    if (allCompleted) {
      setTaskComponentState('none');
    }
    return allCompleted;
  };

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
    // allowPreviousStep: true,
    isShowButtons: false,
    allowKeyboardControl: false,
    disableActiveInteraction: true,
    // @ts-ignore
    steps: [
      {
        element: '.apps-container',
        popover: {
          side: 'left',
          align: 'center',
          borderRadius: '12px 12px 0px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Flex flexDirection={'column'}>
                <Text color={'grayModern.900'} fontSize={'13px'} fontWeight={500}>
                  {t('common:application_desktop')}
                </Text>
                <Text fontSize={'12px'} color={'grayModern.600'} fontWeight={500}>
                  {t('common:application_desktop_tips')}
                </Text>
              </Flex>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-applaunchpad',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_applaunchpad')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-devbox',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_devbox')}
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
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_dbprovider')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      },
      {
        element: '.system-objectstorage',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_objectstorage')}
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
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
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
          side: 'left',
          align: 'center',
          borderRadius: '12px 12px 0px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_costcenter')}
              </Text>
              <PopoverBodyInfo top={'-120px'} />
            </Flex>
          )
        }
      },
      {
        element: '.system-workorder',
        popover: {
          side: 'bottom',
          align: 'start',
          borderRadius: '0px 12px 12px 12px',
          PopoverBody: (
            <Flex gap={'6px'}>
              <DriverStarIcon />
              <Text color={'#24282C'} fontSize={'13px'} fontWeight={500}>
                {t('common:guide_workorder')}
              </Text>
              <PopoverBodyInfo />
            </Flex>
          )
        }
      }
    ].filter((step) => {
      if (step.element === '.apps-container') return true;
      const appKey = step.element.substring(1);
      return installedApps.some((app) => app.key === appKey);
    }),
    onDestroyed: () => {
      completeGuide();
    }
  });

  const startGuide = () => {
    setDesktopGuide(false);
    driverObj.drive();
  };

  const boxStyles: FlexProps = {
    border: '1px solid #69AEFF',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 40px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)',
    flexDirection: 'column',
    maxW: '188px'
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
      overflow="hidden"
      width="90vw"
      maxWidth="900px"
      aspectRatio="3 / 2"
    >
      <Image
        src="/images/driver-bg.png"
        alt="driver"
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        objectFit="cover"
        zIndex={-1}
      />
      <Box position="relative" zIndex={1} padding="16px" height="100%">
        <Flex
          height={'100%'}
          flexDirection={'column'}
          justifyContent={'center'}
          alignItems={'center'}
        >
          <Box fontSize={'28px'} fontWeight={500}>
            {t('common:hello_welcome')}
            <Text display={'inline'} color={'#0884DD'} px="8px">
              {layoutConfig?.meta.title}
            </Text>
            👏
          </Box>
          <Box fontSize={'18px'} fontWeight={500} mt={'54px'}>
            {t('common:you_can_complete_the_following_operations')}
          </Box>
          <Flex gap={'26px'} mt={'28px'}>
            <Flex {...boxStyles}>
              <Flex justifyContent={'start'} alignItems={'center'} gap={'6px'}>
                <LaunchpadIcon />
                <Text fontSize="14px" fontWeight={500} color="grayModern.900">
                  {t('common:usertask.task_launchpad_title')}
                </Text>
              </Flex>
              <Text fontSize="12px" fontWeight={400} color="grayModern.500" marginTop="12px">
                {t('common:usertask.task_launchpad_desc')}
              </Text>
            </Flex>
            <Flex {...boxStyles}>
              <Flex alignItems={'center'} gap={'6px'}>
                <DBproviderIcon />
                <Text fontSize="14px" fontWeight={500} color="grayModern.900">
                  {t('common:usertask.task_database_title')}
                </Text>
              </Flex>
              <Text fontSize="12px" fontWeight={400} color="grayModern.500" marginTop="12px">
                {t('common:usertask.task_database_desc')}
              </Text>
            </Flex>
            <Flex {...boxStyles}>
              <Flex alignItems={'center'} gap={'6px'}>
                <AppStoreIcon />
                <Text fontSize="14px" fontWeight={500} color="grayModern.900">
                  {t('common:usertask.task_appstore_title')}
                </Text>
              </Flex>
              <Text fontSize="12px" fontWeight={400} color="grayModern.500" marginTop="12px">
                {t('common:usertask.task_appstore_desc')}
              </Text>
            </Flex>
          </Flex>

          <Button
            minW="206px"
            mt="46px"
            variant={'solid'}
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
    </Box>
  );

  return {
    UserGuide,
    desktopGuide,
    tasks,
    handleCloseTaskModal,
    checkAllTasksCompleted,
    setTaskComponentState
  };
}
