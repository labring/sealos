import React, { useEffect, useCallback } from 'react';
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
  description: string;
  icon: string;
  status: 'running';
}

const AppsRunningPrompt = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { dontShowAgain, setDontShowAgain } = useAppsRunningPromptStore();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const runningApps = useQuery({
    queryKey: ['getRunningApps'],
    queryFn: getRunningApps,
    enabled: false, // We fetch manually on event listeners
    refetchOnWindowFocus: false
  });

  // Check for running apps and show dialog if needed
  const checkRunningAppsAndShowDialog = useCallback(async () => {
    if (dontShowAgain) {
      return false;
    }

    try {
      const result = await runningApps.refetch();
      const hasRunningApps =
        Object.entries(result.data?.data?.runningCount ?? {}).reduce(
          (acc, [_name, count]) => acc + count,
          0
        ) > 0;

      if (hasRunningApps) {
        onOpen();
        return true; // Prevent default browser behavior
      }
      return false; // Allow normal page close
    } catch (error) {
      console.error('Error checking running apps:', error);
      return false;
    }
  }, [dontShowAgain, runningApps, onOpen]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dontShowAgain) {
        return; // Don't prevent unload
      }

      event.preventDefault();
      // Some browsers need this
      event.returnValue = '';

      setTimeout(() => {
        checkRunningAppsAndShowDialog();
      }, 100);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dontShowAgain, checkRunningAppsAndShowDialog]);

  const appsToCheck: RunningApp[] = [
    {
      id: 'devbox',
      name: 'DevBox',
      description: '个开发环境正在运行',
      icon: '/icons/devbox.svg',
      status: 'running'
    },
    {
      id: 'database',
      name: 'Database',
      description: '个数据库服务运行中',
      icon: '/icons/database.svg',
      status: 'running'
    },
    {
      id: 'applaunchpad',
      name: 'App Launchpad',
      description: '个应用运行中',
      icon: '/icons/app_launchpad.svg',
      status: 'running'
    }
  ];

  const handleCloseModal = () => {
    onClose();
  };

  const handleShutdown = () => {
    onClose();
    // ! ======================================= Handle close apps
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
          <AlertDialogHeader fontSize="18px" fontWeight="600" pb={4}>
            确认关闭页面？
          </AlertDialogHeader>

          <AlertDialogBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="6px">
                <AlertIcon />
                <Text fontSize="14px">
                  检测到以下应用正在运行，请确认是否停止项目运行，避免消耗余额。
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
                            {runningCount + ' ' + app.description}
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
                        运行中
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
                不再显示此提示
              </Checkbox>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter pt={0}>
            <HStack spacing={3}>
              <Button ref={cancelRef} onClick={handleCloseModal} variant="outline" size="md" px={6}>
                关闭本提示
              </Button>
              <Button onClick={handleShutdown} bg={'red.600'} size="md" px={6}>
                去关机
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default AppsRunningPrompt;
