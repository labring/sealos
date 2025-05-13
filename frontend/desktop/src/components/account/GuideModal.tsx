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
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { UserInfo } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useCallback, useState } from 'react';
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
import { useInitWorkspaceStore } from '@/stores/initWorkspace';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
  const { t } = useTranslation();
  const { session } = useSessionStore((s) => s);
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const { installedApps, runningInfo, openApp, setToHighestLayerById } = useAppStore();
  const { initGuide, setInitGuide } = useInitWorkspaceStore();

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
          title: 'Access DevBox',
          description: 'Enter the DevBox page and create a new development environment.',
          image: '/images/onboarding/devbox-1.png'
        },
        {
          title: 'Configure Your DevBox',
          description: 'Set up your development environment with your preferred settings.',
          image: '/images/onboarding/devbox-2.png'
        },
        {
          title: 'Start Coding in Your IDE',
          description: 'Begin coding in your preferred IDE with all configurations set.',
          image: '/images/onboarding/devbox-3.png'
        },
        {
          title: 'Manage and Deploy',
          description: 'Manage your development environment and deploy your application.',
          image: '/images/onboarding/devbox-4.png'
        }
      ],
      stepNumbers: 4
    },
    {
      key: 'system-applaunchpad',
      icon: installedApps.find((app) => app.key === 'system-applaunchpad')?.icon || '',
      title: t('v2:launchpad_title'),
      description: t('v2:launchpad_desc'),
      steps: [
        {
          title: 'Create App Launchpad',
          description: 'Open App Launchpad to deploy a Docker image',
          image: '/images/onboarding/launchpad-1.png'
        },
        {
          title: 'Configure Launchpad',
          description: 'Define image settings, and adjust CPU & memory as needed',
          image: '/images/onboarding/launchpad-2.png'
        },
        {
          title: 'Access Application',
          description: 'Copy the Private or Public Address for access',
          image: '/images/onboarding/launchpad-3.png'
        }
      ],
      stepNumbers: 4
    },
    {
      key: 'system-template',
      icon: installedApps.find((app) => app.key === 'system-template')?.icon || '',
      title: t('v2:template_title'),
      description: t('v2:template_desc'),
      steps: [
        {
          title: 'Choose from template',
          description: 'Explore App Store to deploy an application from a template',
          image: '/images/onboarding/appstore-1.png'
        },
        {
          title: 'Access Application',
          description: 'Get the private or public address from App Launchpad',
          image: '/images/onboarding/appstore-2.png'
        }
      ],
      stepNumbers: 4
    },
    {
      key: 'system-dbprovider',
      icon: installedApps.find((app) => app.key === 'system-dbprovider')?.icon || '',
      title: t('v2:database_title'),
      description: t('v2:database_desc'),
      steps: [
        {
          title: 'Access Database',
          description: 'Open database app to deploy a database',
          image: '/images/onboarding/database-1.png'
        },
        {
          title: 'Deploy a New Database',
          description: 'Choose a database type, and adjust CPU & memory as needed',
          image: '/images/onboarding/database-2.png'
        },
        {
          title: 'Manage & Connect to the Database',
          description: 'Retrieve connection details and manage the database',
          image: '/images/onboarding/database-3.png'
        }
      ],
      stepNumbers: 4
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
        borderColor={isActive ? 'blue.200' : 'gray.200'}
        bg="white"
        transition="all 0.5s ease"
        onClick={onClick}
        height={isActive ? 'auto' : '56px'}
        overflow="hidden"
        position={'relative'}
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
          bg={'#EFF3FF'}
          p={'20px 12px 0px 12px'}
          width={'390px'}
          height={'158px'}
          overflow={'hidden'}
          opacity={isActive ? 1 : 0}
          transition="all 0.5s ease"
          ml={'auto'}
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent
        minW={'900px'}
        h={'510px'}
        p={'4px'}
        borderRadius={'20px'}
        background={'rgba(255, 255, 255, 0.80)'}
        boxShadow={'0px 10px 15px -3px rgba(0, 0, 0, 0.10), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)'}
      >
        <Flex
          flexDirection="column"
          bg={'#fff'}
          w={'100%'}
          h={'100%'}
          borderRadius={'16px'}
          border={'1px solid #B0CBFF'}
          boxShadow={'0px 1px 2px 0px rgba(0, 0, 0, 0.05)'}
          px={'40px'}
        >
          {selectedGuide !== null ? (
            <Box>
              <Flex justify="space-between" align="center" mt={'32px'}>
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
                    onClose();
                    setInitGuide(false);
                    const cur = guideLinks[selectedGuide];

                    switch (cur.key) {
                      case 'system-applaunchpad':
                        return startDriver(appLaunchpadDriverObj(openDesktopApp));
                      case 'system-template':
                        return startDriver(templateDriverObj(openDesktopApp));
                      case 'system-dbprovider':
                        return startDriver(databaseDriverObj(openDesktopApp));
                      case 'system-devbox':
                        return startDriver(devboxDriverObj(openDesktopApp));
                      default:
                        return;
                    }
                  }}
                >
                  Show me
                </Button>
              </Flex>

              <Box maxH="330px" overflowY="auto" pt={'20px'} pr={2}>
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
              <Center gap={2} mt={'12px'} mb={2}>
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
              </Center>
            </Box>
          ) : (
            <>
              <Center mt={'40px'} flexDirection={'column'}>
                <Text fontSize={'24px'} fontWeight={600} color={'#000'} lineHeight={'24px'}>
                  {initGuide
                    ? t('v2:guide_title', { name: infoData.data?.nickname || '' })
                    : 'Quickstart guide'}
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

              <Grid templateColumns="repeat(2, 1fr)" gap={'16px'} mt={'40px'} flex={1}>
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
                    <Center
                      flexShrink={0}
                      width={'40px'}
                      height={'40px'}
                      borderRadius={'7px'}
                      border={'0.5px solid #E4E4E7'}
                      background={'rgba(255, 255, 255, 0.90)'}
                      boxShadow={'0px 0.455px 1.818px 0px rgba(0, 0, 0, 0.12)'}
                    >
                      <Image width={'24px'} height={'24px'} src={item.icon} alt="guide" />
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
              <Divider my={'20px'} borderColor={'#E4E4E7'} />
              <Text
                cursor={'pointer'}
                fontSize={'14px'}
                fontWeight={'500'}
                color={'#1C4EF5'}
                mb={'20px'}
                textAlign={'center'}
                onClick={() => {
                  setInitGuide(false);
                  onClose();
                  startDriver(quitGuideDriverObj);
                }}
              >
                {t('v2:step_title')}
              </Text>
            </>
          )}
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default GuideModal;
