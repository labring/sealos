import {
  Box,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  ModalHeader,
  Text,
  Button,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepNumber,
  StepSeparator,
  Circle,
  ModalCloseButton
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import MyIcon from '../Icon';
import SshConnectModal from './SshConnectModal';

import { JetBrainsGuideData } from '../IDEButton';

const ToolboxModal = ({
  onClose,
  jetbrainsGuideData
}: {
  onSuccess: () => void;
  onClose: () => void;
  jetbrainsGuideData: JetBrainsGuideData;
}) => {
  const t = useTranslations();

  const [onConnecting, setOnConnecting] = useState(false);
  const [onOpenSSHConnectModal, setOnOpenSSHConnectModal] = useState(false);

  const connectToolbox = useCallback(async () => {
    setOnConnecting(true);

    window.open(`jetbrains://gateway/ssh/environment?h=${jetbrainsGuideData.configHost}`, '_blank');

    setOnConnecting(false);
  }, [jetbrainsGuideData]);

  return (
    <Box>
      <Modal
        isOpen
        onClose={onClose}
        lockFocusAcrossFrames={false}
        isCentered
        scrollBehavior={'inside'}
      >
        <ModalOverlay />
        <ModalContent maxWidth={'800px'} w={'600px'} position={'relative'} h={'400px'}>
          <ModalHeader pl={10}>{t('use_jetbrains_toolbox')}</ModalHeader>
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
                      {t.rich('jetbrains_guide_prepare_install_toolbox', {
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
                        window.open('https://www.jetbrains.com/toolbox-app', '_blank');
                      }}
                    >
                      JetBrains Toolbox
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
            {/* connect */}
            <Box pt={6} pb={6}>
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
                onClick={connectToolbox}
                h={'36px'}
              >
                {t('jetbrains_guide_start_to_connect')}
              </Button>
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

export default ToolboxModal;
