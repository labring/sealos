import React, { useEffect, useCallback, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Flex,
  HStack,
  Image,
  Text,
  VStack,
  useDisclosure
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { getRunningApps } from '@/api/platform';
import { useAppsRunningPromptStore } from '@/stores/appsRunningPrompt';

interface RunningApp {
  id: string;
  name: string;
  description: (count: number) => string;
  icon: string;
}

const AppsRunningPrompt = () => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { dontShowAgain, setDontShowAgain, blockingPageUnload } = useAppsRunningPromptStore();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [allowClose, setAllowClose] = useState(false);

  const runningApps = useQuery({
    queryKey: ['getRunningApps'],
    queryFn: getRunningApps,
    enabled: false, // We fetch manually
    refetchOnWindowFocus: false
  });

  const checkRunningApps = useCallback(async (): Promise<boolean> => {
    try {
      const result = await runningApps.refetch();

      if (result.isError) {
        // On error, assume no running apps to avoid blocking page close
        return false;
      }

      const hasRunning =
        Object.entries(result.data?.data?.runningCount ?? {}).reduce(
          (acc, [_name, count]) => acc + count,
          0
        ) > 0;

      return hasRunning;
    } catch (error) {
      console.error('Error checking running apps:', error);
      // On error, assume no running apps to avoid blocking page close
      return false;
    }
  }, [runningApps]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dontShowAgain || !blockingPageUnload || allowClose) {
        return; // Don't prevent unload
      }

      // Prevent default to give us time to check
      event.preventDefault();
      event.returnValue = '';

      // Start async check
      checkRunningApps()
        .then((hasRunningApps) => {
          if (hasRunningApps) {
            // Show dialog if there are running apps
            setTimeout(() => onOpen(), 100);
          } else {
            // No running apps, allow future closes
            setAllowClose(true);
            // Trigger close again
            setTimeout(() => {
              window.close();
            }, 100);
          }
        })
        .catch((error) => {
          console.error('Error checking running apps:', error);
          // On error, allow future closes
          setAllowClose(true);
          // Trigger close again
          setTimeout(() => {
            window.close();
          }, 100);
        });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dontShowAgain, allowClose, onOpen, checkRunningApps, setAllowClose, blockingPageUnload]);

  const appsToCheck: RunningApp[] = [
    {
      id: 'devbox',
      name: t('common:apps_running_app_devbox'),
      description: (count) => t('common:apps_running_desc_devbox', { count }),
      icon: '/icons/devbox.svg'
    },
    {
      id: 'database',
      name: t('common:apps_running_app_database'),
      description: (count) => t('common:apps_running_prompt_desc_devbox', { count }),
      icon: '/icons/database.svg'
    },
    {
      id: 'applaunchpad',
      name: t('common:apps_running_app_applaunchpad'),
      description: (count) => t('common:apps_running_prompt_desc_applaunchpad', { count }),
      icon: '/icons/app_launchpad.svg'
    }
  ];

  const handleShutdown = () => {
    onClose();
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
      size="md"
    >
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="8px" maxW="480px" mx={4}>
          <AlertDialogHeader fontSize="18px" fontWeight="600" pb={4} position="relative">
            <Flex justify="space-between" align="center">
              <Text>{t('common:apps_running_title')}</Text>
              <CloseButton onClick={onClose} size="sm" />
            </Flex>
          </AlertDialogHeader>

          <AlertDialogBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="6px" bg={'#FEFCE8'}>
                <AlertIcon />
                <Text fontSize="14px" color={'#A16207'}>
                  {t('common:apps_running_alert')}
                </Text>
              </Alert>

              <VStack spacing={3} align="stretch">
                {appsToCheck
                  .map((app) => ({
                    app,
                    runningCount:
                      Object.entries(runningApps.data?.data?.runningCount ?? {}).find(
                        ([name]) => name === app.id
                      )?.[1] ?? 0
                  }))
                  // Show running apps (count > 0) only
                  .filter(({ runningCount }) => runningCount > 0)
                  .map(({ app, runningCount }) => (
                    <Flex
                      key={app.id}
                      align="center"
                      justify="space-between"
                      p={3}
                      borderRadius="6px"
                      bg="gray.50"
                    >
                      <HStack spacing={3}>
                        <Box
                          borderRadius="6px"
                          overflow="hidden"
                          bg="white"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          border="1px solid"
                          borderColor="gray.200"
                        >
                          <Image
                            src={app.icon}
                            alt={app.name}
                            w="24px"
                            h="24px"
                            fallback={<Box w="24px" h="24px" bg="gray.300" />}
                          />
                        </Box>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="14px" fontWeight="500" color="gray.900">
                            {app.name}
                          </Text>
                          <Text fontSize="12px" color="gray.600">
                            {app.description(runningCount)}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge
                        colorScheme="green"
                        variant="subtle"
                        fontSize="12px"
                        px={2}
                        py={1}
                        borderRadius="4px"
                      >
                        {t('common:apps_running_running_badge')}
                      </Badge>
                    </Flex>
                  ))}
              </VStack>

              {/* Don't show again */}
              <Checkbox
                isChecked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                fontSize="14px"
                color="gray.600"
              >
                {t('common:apps_running_do_not_show_again')}
              </Checkbox>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter pt={0}>
            <HStack spacing={3}>
              <Button ref={cancelRef} onClick={handleShutdown} bg={'red.600'} size="md" px={6}>
                {t('common:apps_running_shutdown')}
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default AppsRunningPrompt;
