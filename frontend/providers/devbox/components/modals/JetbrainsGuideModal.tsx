import {
  Box,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  ModalHeader,
  Text,
  Divider,
  Button,
  Flex,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepNumber,
  StepSeparator,
  Grid,
  GridItem,
  Circle,
  ModalCloseButton,
  Progress
} from '@chakra-ui/react';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import MyIcon from '../Icon';
import SshConnectModal from './SshConnectModal';

import { JetBrainsGuideData } from '../IDEButton';
import { execCommandInDevboxPod } from '@/api/devbox';

const JetBrainsGuideModal = ({
  onClose,
  jetbrainsGuideData
}: {
  onSuccess: () => void;
  onClose: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}) => {
  const t = useTranslations();

  const controllerRef = useRef<AbortController | null>(null);

  const recommendIDE = runtimeTypeToIDEType(jetbrainsGuideData.runtimeType);

  const [selectedIDE, setSelectedIDE] = useState<JetbrainsIDEObj>(recommendIDE);

  const [progress, setProgress] = useState(0);
  const [onConnecting, setOnConnecting] = useState(false);
  const [onOpenSSHConnectModal, setOnOpenSSHConnectModal] = useState(false);

  const connectIDE = useCallback(
    async (idePathName: string, version: string) => {
      window.open(
        `jetbrains-gateway://connect#host=${
          jetbrainsGuideData.configHost
        }&type=ssh&deploy=false&projectPath=${encodeURIComponent(
          jetbrainsGuideData.workingDir
        )}&user=${encodeURIComponent(jetbrainsGuideData.userName)}&port=${encodeURIComponent(
          jetbrainsGuideData.port
        )}&idePath=%2Fhome%2Fdevbox%2F.cache%2FJetBrains%2F${idePathName}${version}`,
        '_blank'
      );
    },
    [jetbrainsGuideData]
  );

  const handleConnectIDE = useCallback(async () => {
    setOnConnecting(true);

    const res = await fetch(
      `https://data.services.jetbrains.com/products/releases?code=${selectedIDE.productCode}&type=release&latest=true&build=`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await res.json();

    const controller = new AbortController();
    controllerRef.current = controller;

    const version = data[selectedIDE.productCode][0].version;
    const downloadLink = data[selectedIDE.productCode][0].downloads['linux']['link'];
    const idePathName = selectedIDE.value;

    // NOTE: workingDir /home/devbox/project -> /home/devbox, workingDir maybe change in the future
    const basePath = jetbrainsGuideData.workingDir.split('/').slice(0, -1).join('/');

    const execDownloadCommand = `
    IDE_DIR="${basePath}/.cache/JetBrains/${idePathName}${version}";
    if [ -d "$IDE_DIR" ] && [ ! -f "$IDE_DIR/bin/${selectedIDE.binName}" ]; then
      rm -rf "$IDE_DIR";
    fi;
    [ ! -d ${basePath}/.cache/JetBrains/${idePathName}${version} ] && mkdir -p ${basePath}/.cache/JetBrains/${idePathName}${version} && wget -q --show-progress --progress=bar:force -O- ${downloadLink} | tar -xzC ${basePath}/.cache/JetBrains/${idePathName}${version} --strip-components=1 && chmod -R 776 ${basePath}/.cache && chown -R devbox:devbox ${basePath}/.cache`;

    try {
      await execCommandInDevboxPod({
        devboxName: jetbrainsGuideData.devboxName,
        command: execDownloadCommand,
        idePath: `/home/devbox/.cache/JetBrains/${idePathName}${version}`,
        onDownloadProgress: (progressEvent) => {
          const text = progressEvent.event.target.response;
          const progressMatch = text.match(/\s+(\d+)%\[/g);
          const progress = progressMatch
            ? parseInt(progressMatch[progressMatch.length - 1].split('%')[0])
            : null;

          if (progress) {
            setProgress(progress);
          }
        },
        signal: controller.signal
      });
      setOnConnecting(false);
      setProgress(0);
    } catch (error: any) {
      if (
        !error ||
        error.startsWith('nvidia driver modules are not yet loaded, invoking runc directly') ||
        error.includes('100%')
      ) {
        connectIDE(idePathName, version);
      }
      setProgress(0);
      setOnConnecting(false);
    }
  }, [selectedIDE, jetbrainsGuideData.devboxName, connectIDE, jetbrainsGuideData.workingDir]);

  const debouncedHandleConnectIDE = useMemo(
    () => debounce(handleConnectIDE, 3000),
    [handleConnectIDE]
  );

  useEffect(() => {
    return () => {
      debouncedHandleConnectIDE.cancel();
    };
  }, [debouncedHandleConnectIDE]);

  return (
    <Box>
      <Modal
        isOpen
        onClose={onConnecting ? () => {} : onClose}
        lockFocusAcrossFrames={false}
        isCentered
        scrollBehavior={'inside'}
      >
        <ModalOverlay />
        <ModalContent maxWidth={'800px'} w={'700px'} position={'relative'} h={'785px'}>
          <ModalHeader pl={10}>{t('use_jetbrains')}</ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} isDisabled={onConnecting} />
          <ModalBody pb={6} overflowY={'auto'}>
            {/* prepare */}
            <Box pb={6}>
              <Text fontWeight={'bold'} fontSize={'lg'} mb={6}>
                {t('jetbrains_guide_prepare')}
              </Text>
              <Stepper orientation="vertical" index={-1} mt={4} gap={0} position={'relative'}>
                {/* 1 */}
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Box mt={1} ml={2} mb={5}>
                    <Box fontSize={'14px'} mb={3}>
                      {t.rich('jetbrains_guide_prepare_install', {
                        blue: (chunks) => (
                          <Text
                            fontWeight={'bold'}
                            display={'inline-block'}
                            color={'brightBlue.600'}
                          >
                            {chunks}
                          </Text>
                        )
                      })}
                    </Box>
                    <Button
                      leftIcon={<MyIcon name="upperRight" color={'grayModern.600'} w={'16px'} />}
                      bg={'white'}
                      color={'grayModern.600'}
                      borderRadius={'5px'}
                      borderWidth={1}
                      size={'sm'}
                      _hover={{
                        color: 'brightBlue.600',
                        '& svg': {
                          color: 'brightBlue.600'
                        }
                      }}
                      onClick={() => {
                        window.open('https://code-with-me.jetbrains.com/remoteDev', '_blank');
                      }}
                    >
                      JetBrains Gateway
                    </Button>
                  </Box>
                  <StepSeparator />
                </Step>
                {/* 2 */}
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Box mt={1} ml={2} mb={5}>
                    <Box fontSize={'14px'} mb={3}>
                      {t.rich('jetbrains_guide_click_to_config', {
                        blue: (chunks) => (
                          <Text
                            fontWeight={'bold'}
                            display={'inline-block'}
                            color={'brightBlue.600'}
                          >
                            {chunks}
                          </Text>
                        )
                      })}
                    </Box>
                    <Button
                      leftIcon={<MyIcon name="settings" color={'grayModern.600'} w={'16px'} />}
                      bg={'white'}
                      color={'grayModern.600'}
                      borderRadius={'5px'}
                      borderWidth={1}
                      size={'sm'}
                      _hover={{
                        color: 'brightBlue.600',
                        '& svg': {
                          color: 'brightBlue.600'
                        }
                      }}
                      onClick={() => setOnOpenSSHConnectModal(true)}
                    >
                      {t('jetbrains_guide_config_ssh')}
                    </Button>
                  </Box>
                  <StepSeparator />
                </Step>
                {/* done */}
                <Step>
                  <Circle
                    size="10px"
                    bg="grayModern.100"
                    top={-3}
                    left={2.5}
                    position={'absolute'}
                  />
                </Step>
              </Stepper>
            </Box>
            <Divider />
            <Box pt={6} pb={6}>
              <Flex alignItems={'center'} mb={6}>
                <Text fontWeight={'bold'} fontSize={'lg'} mr={2}>
                  {t('jetbrains_guide_start_to_use')}
                </Text>
              </Flex>
              <Text fontSize={'14px'} fontWeight={'400'}>
                {t('jetbrains_guide_select_ide')}
              </Text>
              <Grid templateColumns={'repeat(3, 1fr)'} gap={4} mt={4}>
                {Object.values(jetbrainsIDEObj).map((ideType: any) => (
                  <GridItem key={ideType.value}>
                    <Flex
                      bg={selectedIDE === ideType ? 'brightBlue.25' : 'grayModern.25'}
                      borderWidth={1}
                      boxShadow={
                        selectedIDE === ideType ? '0 0 0 2.4px rgba(33, 155, 244, 0.15)' : 'none'
                      }
                      borderColor={selectedIDE === ideType ? 'brightBlue.500' : 'grayModern.200'}
                      borderRadius={'6px'}
                      p={4}
                      justifyContent={'center'}
                      alignItems={'center'}
                      flexDirection={'column'}
                      cursor={onConnecting ? 'not-allowed' : 'pointer'}
                      opacity={onConnecting ? 0.5 : 1}
                      _hover={{
                        bg: onConnecting ? 'inherit' : 'brightBlue.25'
                      }}
                      onClick={() => {
                        if (!onConnecting) {
                          setSelectedIDE(ideType);
                        }
                      }}
                      position={'relative'}
                    >
                      <MyIcon name={ideType.value as any} color={'grayModern.600'} w={'36px'} />
                      <Text>{ideType.label}</Text>
                      {recommendIDE === ideType && (
                        <Box
                          bg="yellow.100"
                          top={1.5}
                          left={0}
                          position={'absolute'}
                          p={'1px 10px'}
                          borderRadius={'0px 4px 4px 0px'}
                          fontSize={'12px'}
                          color={'yellow.600'}
                        >
                          {t('recommend')}
                        </Box>
                      )}
                    </Flex>
                  </GridItem>
                ))}
              </Grid>
              <Button
                mt={4}
                w={'100%'}
                bg={'white'}
                borderWidth={1}
                borderRadius={'6px'}
                color={'grayModern.600'}
                size={'sm'}
                px={1}
                borderColor={onConnecting ? 'brightBlue.500' : 'grayModern.200'}
                _hover={
                  onConnecting
                    ? {}
                    : {
                        color: 'brightBlue.600',
                        borderColor: 'brightBlue.500'
                      }
                }
                onClick={debouncedHandleConnectIDE}
                h={'36px'}
              >
                {onConnecting ? (
                  <Flex position={'relative'} w={'full'} alignItems={'center'} justify={'center'}>
                    {t.rich('jetbrains_guide_connecting', {
                      process: progress
                    })}
                    <Box
                      _hover={{
                        textDecoration: 'underline'
                      }}
                      cursor={'pointer'}
                      color={'brightBlue.600'}
                      ml={6}
                      onClick={(e) => {
                        e.stopPropagation();
                        controllerRef.current?.abort();
                        controllerRef.current = null;
                        setProgress(0);
                        setOnConnecting(false);
                      }}
                    >
                      {t('jetbrains_guide_cancel')}
                    </Box>
                    <Progress
                      value={progress}
                      size={'xs'}
                      colorScheme={'brightBlue'}
                      position={'absolute'}
                      bottom={'-9.5px'}
                      w={'full'}
                      left={0}
                      right={0}
                    />
                  </Flex>
                ) : (
                  t('jetbrains_guide_start_to_connect')
                )}
              </Button>
              {onConnecting && (
                <Flex
                  mt={4}
                  bg={'brightBlue.50'}
                  p={2}
                  borderRadius={'6px'}
                  alignItems={'center'}
                  justify={'center'}
                >
                  <MyIcon name="infoCircle" color={'brightBlue.600'} w={'16px'} mr={1} />
                  <Text fontSize={'14px'} fontWeight={'400'} color={'brightBlue.600'}>
                    {t('jetbrains_guide_connecting_info')}
                  </Text>
                </Flex>
              )}
            </Box>
            {onOpenSSHConnectModal && (
              <SshConnectModal
                onClose={() => setOnOpenSSHConnectModal(false)}
                onSuccess={() => {}}
                jetbrainsGuideData={jetbrainsGuideData}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

interface JetbrainsIDEObj {
  label: string;
  value: string;
  binName: string;
  productCode: string;
}
const jetbrainsIDEObj: { [key: string]: JetbrainsIDEObj } = {
  IntelliJ: {
    label: 'IntelliJ IDEA',
    value: 'intellij',
    binName: 'idea.sh',
    productCode: 'IIU'
  },
  PyCharm: {
    label: 'PyCharm',
    value: 'pycharm',
    binName: 'pycharm.sh',
    productCode: 'PCP'
  },
  WebStorm: {
    label: 'WebStorm',
    value: 'webstorm',
    binName: 'webstorm.sh',
    productCode: 'WS'
  },
  Rider: {
    label: 'Rider',
    value: 'rider',
    binName: 'rider.sh',
    productCode: 'RD'
  },
  CLion: {
    label: 'CLion',
    value: 'clion',
    binName: 'clion.sh',
    productCode: 'CL'
  },
  GoLand: {
    label: 'GoLand',
    value: 'goland',
    binName: 'goland.sh',
    productCode: 'GO'
  },
  RubyMine: {
    label: 'RubyMine',
    value: 'rubymine',
    binName: 'rubymine.sh',
    productCode: 'RM'
  },
  PhpStorm: {
    label: 'PhpStorm',
    value: 'phpstorm',
    binName: 'phpstorm.sh',
    productCode: 'PS'
  },
  RustRover: {
    label: 'RustRover',
    value: 'rustover',
    binName: 'rustover.sh',
    productCode: 'RR'
  }
};

const runtimeTypeToIDEType = (runtimeType: string): any => {
  switch (runtimeType) {
    // Python
    case 'python':
    case 'django':
    case 'flask':
      return jetbrainsIDEObj.PyCharm;

    // Go
    case 'go':
    case 'gin':
    case 'echo':
    case 'hertz':
    case 'iris':
    case 'chi':
      return jetbrainsIDEObj.GoLand;

    // Frontend and nodejs
    case 'angular':
    case 'ant-design':
    case 'astro':
    case 'chakra-ui':
    case 'express.js':
    case 'react':
    case 'vue':
    case 'react':
    case 'hexo':
    case 'hugo':
    case 'sealaf':
    case 'nuxt3':
    case 'svelte':
    case 'umi':
    case 'vitepress':
    case 'next.js':
    case 'nest.js':
    case 'node.js':
    case 'docusaurus':
      return jetbrainsIDEObj.WebStorm;

    // C/C++
    case 'c':
    case 'cpp':
      return jetbrainsIDEObj.CLion;

    // Java
    case 'java':
    case 'quarkus':
    case 'vert.x':
    case 'spring-boot':
      return jetbrainsIDEObj.IntelliJ;

    // PHP
    case 'php':
    case 'laravel':
      return jetbrainsIDEObj.PhpStorm;

    // Ruby
    case 'ruby':
    case 'rails':
      return jetbrainsIDEObj.RubyMine;

    // Rust
    case 'rust':
    case 'rocket':
      return jetbrainsIDEObj.RustRover;

    // other
    case 'debian-ssh':
    case 'custom':
    default:
      return jetbrainsIDEObj.IntelliJ;
  }
};

export default JetBrainsGuideModal;
