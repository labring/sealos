import {
  Modal,
  ModalOverlay,
  ModalContent,
  Text,
  Box,
  Flex,
  Icon,
  Center,
  Grid,
  Divider,
  Button
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { UserInfo } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useCallback } from 'react';
import useAppStore from '@/stores/app';
import {
  devboxDriverObj,
  quitGuideDriverObj,
  startDriver,
  appLaunchpadDriverObj,
  templateDriverObj,
  databaseDriverObj
} from './driver';
import { WindowSize } from '@/types';
import { Image } from '@chakra-ui/react';
import { useGuideModalStore } from '@/stores/guideModal';

const GuideModal = () => {
  const { t } = useTranslation();
  const { session } = useSessionStore((s) => s);
  const { installedApps, runningInfo, openApp, setToHighestLayerById, closeAppAll } = useAppStore();
  const {
    isOpen,
    selectedGuide,
    activeStep,
    initGuide: guideModalInitGuide,
    closeGuideModal,
    setSelectedGuide,
    setActiveStep,
    setInitGuide
  } = useGuideModalStore();

  const infoData = useQuery({
    queryFn: UserInfo,
    queryKey: [session?.token, 'UserInfo'],
    select(d) {
      return d.data?.info;
    }
  });

  const openDesktopApp = useCallback(
    ({
      appKey,
      query = {},
      messageData = {},
      pathname = '/',
      appSize = 'maximize'
    }: {
      appKey: string;
      query?: Record<string, string>;
      messageData?: Record<string, any>;
      pathname: string;
      appSize?: WindowSize;
    }) => {
      const app = installedApps.find((item) => item.key === appKey);
      const runningApp = runningInfo.find((item) => item.key === appKey);
      if (!app) return;
      openApp(app, { query, pathname, appSize });
      if (runningApp) {
        setToHighestLayerById(runningApp.pid);
      }
      // post message
      const iframe = document.getElementById(`app-window-${appKey}`) as HTMLIFrameElement;
      if (!iframe) return;
      iframe.contentWindow?.postMessage(messageData, app.data.url);
    },
    [installedApps, openApp, runningInfo, setToHighestLayerById]
  );

  const guideLinks: {
    key: string;
    icon: string;
    title: string;
    description: string;
    steps: {
      title: string;
      description: string;
      image: string;
    }[];
    stepNumbers: number;
  }[] = [
    {
      key: 'system-devbox',
      icon: installedApps.find((app) => app.key === 'system-devbox')?.icon || '',
      title: t('v2:devbox_title'),
      description: t('v2:devbox_desc'),
      steps: [
        {
          title: t('v2:devbox_step_1'),
          description: t('v2:devbox_step_1_desc'),
          image: '/images/onboarding/devbox-1.png'
        },
        {
          title: t('v2:devbox_step_2'),
          description: t('v2:devbox_step_2_desc'),
          image: '/images/onboarding/devbox-2.png'
        },
        {
          title: t('v2:devbox_step_3'),
          description: t('v2:devbox_step_3_desc'),
          image: '/images/onboarding/devbox-3.png'
        }
      ],
      stepNumbers: 3
    },
    {
      key: 'system-dbprovider',
      icon: installedApps.find((app) => app.key === 'system-dbprovider')?.icon || '',
      title: t('v2:database_title'),
      description: t('v2:database_desc'),
      steps: [
        {
          title: t('v2:database_step_1'),
          description: t('v2:database_step_1_desc'),
          image: '/images/onboarding/database-1.png'
        },
        {
          title: t('v2:database_step_2'),
          description: t('v2:database_step_2_desc'),
          image: '/images/onboarding/database-2.png'
        },
        {
          title: t('v2:database_step_3'),
          description: t('v2:database_step_3_desc'),
          image: '/images/onboarding/database-3.png'
        }
      ],
      stepNumbers: 3
    },
    {
      key: 'system-applaunchpad',
      icon: installedApps.find((app) => app.key === 'system-applaunchpad')?.icon || '',
      title: t('v2:launchpad_title'),
      description: t('v2:launchpad_desc'),
      steps: [
        {
          title: t('v2:launchpad_step_1'),
          description: t('v2:launchpad_step_1_desc'),
          image: '/images/onboarding/app-launchpad-1.png'
        },
        {
          title: t('v2:launchpad_step_2'),
          description: t('v2:launchpad_step_2_desc'),
          image: '/images/onboarding/app-launchpad-2.png'
        },
        {
          title: t('v2:launchpad_step_3'),
          description: t('v2:launchpad_step_3_desc'),
          image: '/images/onboarding/app-launchpad-3.png'
        }
      ],
      stepNumbers: 3
    },
    {
      key: 'system-template',
      icon: installedApps.find((app) => app.key === 'system-template')?.icon || '',
      title: t('v2:template_title'),
      description: t('v2:template_desc'),
      steps: [
        {
          title: t('v2:template_step_1'),
          description: t('v2:template_step_1_desc'),
          image: '/images/onboarding/appstore-1.png'
        },
        {
          title: t('v2:template_step_2'),
          description: t('v2:template_step_2_desc'),
          image: '/images/onboarding/appstore-2.png'
        }
      ],
      stepNumbers: 2
    }
  ];

  const StepCard = ({
    step,
    index,
    isActive,
    onClick
  }: {
    step: {
      title: string;
      description: string;
      image: string;
    };
    index: number;
    isActive: boolean;
    onClick: () => void;
  }) => {
    return (
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        key={index}
        p={'12px 12px 0px 12px'}
        mb={'8px'}
        borderRadius="xl"
        border="1px solid"
        borderColor={isActive ? '#A1A1AA' : '#E4E4E7'}
        bg="white"
        transition="all 0.5s ease"
        onClick={onClick}
        height={isActive ? 'auto' : '56px'}
        overflow="hidden"
        position={'relative'}
        boxShadow={isActive ? '0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)' : 'none'}
      >
        <Flex alignSelf={'start'}>
          <Center
            w={'24px'}
            h={'24px'}
            borderRadius="full"
            fontSize="md"
            fontWeight="bold"
            mr={4}
            flexShrink={0}
            border={'1px solid #E4E4E7'}
          >
            {index + 1}
          </Center>
          <Box>
            <Text fontSize="16px" fontWeight="600">
              {step.title}
            </Text>
            <Text
              color="gray.600"
              mt={1}
              fontSize="14px"
              opacity={isActive ? 1 : 0}
              maxH={isActive ? '100px' : '0'}
              transition="all 0.5s ease"
            >
              {step.description}
            </Text>
          </Box>
        </Flex>
        <Box
          borderTopRadius={'12px'}
          p={'20px 12px 0px 12px'}
          width={'390px'}
          height={'158px'}
          overflow={'hidden'}
          opacity={isActive ? 1 : 0}
          transition="all 0.5s ease"
          ml={'auto'}
          backgroundImage={'/images/onboarding/bg.png'}
          backgroundSize={'cover'}
          backgroundPosition={'center'}
        >
          <Image
            style={{
              borderRadius: '6px'
            }}
            src={step.image}
            alt="guide"
          />
        </Box>
      </Flex>
    );
  };

  const handleCloseGuideModal = () => {
    setInitGuide(false);
    closeGuideModal();
    startDriver(quitGuideDriverObj(t));
  };

  return (
    <Modal isOpen={isOpen} onClose={closeGuideModal} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent minW={'900px'} h={'510px'} borderRadius={'20px'} background={'#FAFAFA'}>
        <Flex flexDirection="column" bg={'#FAFAFA'} w={'100%'} h={'100%'} borderRadius={'16px'}>
          {selectedGuide !== null ? (
            <Box>
              <Flex
                alignItems={'center'}
                px={'40px'}
                py={'20px'}
                bg={'#F4F4F5'}
                borderTopRadius={'16px'}
                borderBottom={'1px solid #E4E4E7'}
              >
                <CircleAlert size={16} color="#18181B" />
                <Text color={'#18181B'} fontWeight={500} fontSize={'16px'} ml={'12px'}>
                  {t('v2:guide_info_text')}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center" mt={'32px'} px={'40px'}>
                <Flex align="center" gap={4}>
                  <Icon
                    as={ArrowLeft}
                    boxSize={6}
                    cursor="pointer"
                    onClick={() => setSelectedGuide(null)}
                    _hover={{ color: 'blue.500' }}
                  />
                  <Box>
                    <Text fontSize="24px" fontWeight={600}>
                      {guideLinks[selectedGuide].title}
                    </Text>
                    <Text color="gray.600" mt={1} fontSize="14px">
                      {guideLinks[selectedGuide].description}
                    </Text>
                  </Box>
                </Flex>
                <Button
                  height={'36px'}
                  bg="black"
                  color="white"
                  borderRadius="8px"
                  _hover={{ bg: 'gray.800' }}
                  onClick={() => {
                    closeAppAll();
                    closeGuideModal();
                    setInitGuide(false);
                    const cur = guideLinks[selectedGuide];

                    switch (cur.key) {
                      case 'system-applaunchpad':
                        return startDriver(appLaunchpadDriverObj(openDesktopApp, t));
                      case 'system-template':
                        return startDriver(templateDriverObj(openDesktopApp, t));
                      case 'system-dbprovider':
                        return startDriver(databaseDriverObj(openDesktopApp, t));
                      case 'system-devbox':
                        return startDriver(devboxDriverObj(openDesktopApp, t));
                      default:
                        return;
                    }
                  }}
                >
                  {t('v2:show_me')}
                </Button>
              </Flex>

              <Box maxH="330px" overflowY="auto" pt={'20px'} pr={2} px={'40px'}>
                {guideLinks[selectedGuide].steps.map((step, index) => (
                  <StepCard
                    key={index}
                    step={step}
                    index={index}
                    isActive={activeStep === index}
                    onClick={() => setActiveStep(index)}
                  />
                ))}
              </Box>
              {/* <Center gap={2} mt={'12px'} mb={2}>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius={'8px'}
                  border="1px solid"
                  borderColor="#E4E4E7"
                  align="center"
                  justify="center"
                  cursor={selectedGuide > 0 ? 'pointer' : 'not-allowed'}
                  opacity={selectedGuide > 0 ? 1 : 0.4}
                  _hover={{ bg: selectedGuide > 0 ? 'gray.50' : 'initial' }}
                  onClick={() => {
                    if (selectedGuide > 0) {
                      setSelectedGuide(selectedGuide - 1);
                      setActiveStep(0);
                    }
                  }}
                >
                  <ChevronLeft size={18} color="#737373" />
                </Flex>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius={'8px'}
                  border="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="center"
                  cursor={selectedGuide < guideLinks.length - 1 ? 'pointer' : 'not-allowed'}
                  opacity={selectedGuide < guideLinks.length - 1 ? 1 : 0.4}
                  _hover={{ bg: selectedGuide < guideLinks.length - 1 ? 'gray.50' : 'initial' }}
                  onClick={() => {
                    if (selectedGuide < guideLinks.length - 1) {
                      setSelectedGuide(selectedGuide + 1);
                      setActiveStep(0);
                    }
                  }}
                >
                  <ChevronRight size={18} color="#737373" />
                </Flex>
              </Center> */}
            </Box>
          ) : (
            <Box px={'40px'} position={'relative'}>
              <Center
                position={'absolute'}
                top={'20px'}
                right={'24px'}
                cursor={'pointer'}
                onClick={handleCloseGuideModal}
              >
                <X size={24} color="#18181B" />
              </Center>
              <Center mt={'56px'} flexDirection={'column'}>
                <Text fontSize={'24px'} fontWeight={600} color={'#000'} lineHeight={'24px'}>
                  {guideModalInitGuide
                    ? t('v2:guide_title', { name: infoData.data?.nickname || '' })
                    : t('v2:quickstart_guide')}
                </Text>
                <Text
                  mt={'8px'}
                  fontSize={'14px'}
                  fontWeight={'400'}
                  color={'#71717A'}
                  lineHeight={'20px'}
                >
                  {t('v2:documentation_desc')}
                </Text>
              </Center>

              <Grid templateColumns="repeat(2, 1fr)" gap={'16px'} mt={'32px'} flex={1}>
                {guideLinks.map((item, index) => (
                  <Flex
                    key={index}
                    onClick={() => setSelectedGuide(index)}
                    p={'20px'}
                    borderRadius="16px"
                    border={'1px solid #E4E4E7'}
                    background={'#FFF'}
                    boxShadow={'0px 1px 2px 0px rgba(0, 0, 0, 0.05)'}
                    _hover={{
                      boxShadow: 'lg',
                      transform: 'scale(1.002)',
                      transition: 'all 0.2s'
                    }}
                    cursor={'pointer'}
                    gap={'16px'}
                  >
                    <Center flexShrink={0} width={'40px'} height={'40px'} borderRadius={'12px'}>
                      <Image
                        boxShadow={'0px 2.889px 4.334px -0.867px rgba(0, 0, 0, 0.05)'}
                        border={'0.5px solid rgba(0, 0, 0, 0.05)'}
                        borderRadius={'12px'}
                        width={'40px'}
                        height={'40px'}
                        src={item.icon}
                        alt="guide"
                      />
                    </Center>
                    <Box>
                      <Text
                        fontSize="16px"
                        fontWeight="600"
                        mb={'8px'}
                        color={'#18181B'}
                        lineHeight={'16px'}
                      >
                        {item.title}
                      </Text>
                      <Text color="#71717A" height={'40px'} fontSize="14px" mb={'12px'}>
                        {item.description}
                      </Text>
                      <Text
                        lineHeight={'20px'}
                        color="#18181B"
                        fontSize="14px"
                        mt={'auto'}
                        fontWeight={'500'}
                      >
                        {t('v2:guide_steps', { count: item.stepNumbers })}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </Grid>

              <Text
                mt={'32px'}
                cursor={'pointer'}
                fontSize={'14px'}
                fontWeight={'500'}
                color={'#1C4EF5'}
                mb={'20px'}
                textAlign={'center'}
                onClick={handleCloseGuideModal}
              >
                {t('v2:step_title')}
              </Text>
            </Box>
          )}
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default GuideModal;
