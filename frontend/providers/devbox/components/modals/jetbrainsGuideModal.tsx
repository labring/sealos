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
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import MyIcon from '../Icon'
import SshConnectModal from './SshConnectModal'
import { JetBrainsGuideData } from '../IDEButton'

const JetBrainsGuideModal = ({
  onClose,
  jetbrainsGuideData
}: {
  onSuccess: () => void
  onClose: () => void
  jetbrainsGuideData: JetBrainsGuideData
}) => {
  const t = useTranslations()

  const recommendIDE = runtimeTypeToIDEType(jetbrainsGuideData.runtimeType)

  const [onOpenSSHConnectModal, setOnOpenSSHConnectModal] = useState(false)
  const [selectedIDE, setSelectedIDE] = useState<string | null>(recommendIDE.value)
  const [onConnecting, setOnConnecting] = useState(false)

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent top={'5%'} maxWidth={'800px'} w={'700px'} h={'80%'} position={'relative'}>
          <ModalHeader pl={10}>{t('use_jetbrains')}</ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} />
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
                            color={'brightBlue.600'}>
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
                        window.open('https://code-with-me.jetbrains.com/remoteDev', '_blank')
                      }}>
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
                            color={'brightBlue.600'}>
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
                      onClick={() => setOnOpenSSHConnectModal(true)}>
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
                {Object.values(jetbrainsIDEObj).map((ideType) => (
                  <GridItem key={ideType.value}>
                    <Flex
                      bg={selectedIDE === ideType.value ? 'brightBlue.25' : 'grayModern.25'}
                      borderWidth={1}
                      boxShadow={
                        selectedIDE === ideType.value
                          ? '0 0 0 2.4px rgba(33, 155, 244, 0.15)'
                          : 'none'
                      }
                      borderColor={
                        selectedIDE === ideType.value ? 'brightBlue.500' : 'grayModern.200'
                      }
                      borderRadius={'6px'}
                      p={4}
                      justifyContent={'center'}
                      alignItems={'center'}
                      flexDirection={'column'}
                      cursor={'pointer'}
                      _hover={{
                        bg: 'brightBlue.25'
                      }}
                      onClick={() => {
                        setSelectedIDE(ideType.value)
                      }}
                      position={'relative'}>
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
                          color={'yellow.600'}>
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
                onClick={() => {
                  setOnConnecting(true)
                }}
                h={'36px'}>
                {onConnecting ? (
                  <Flex position={'relative'} w={'full'} alignItems={'center'} justify={'center'}>
                    {t.rich('jetbrains_guide_connecting', {
                      process: '100'
                    })}
                    <Box
                      _hover={{
                        textDecoration: 'underline'
                      }}
                      cursor={'pointer'}
                      color={'brightBlue.600'}
                      ml={1}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOnConnecting(false)
                      }}>
                      {t('jetbrains_guide_cancel')}
                    </Box>
                    <Progress
                      value={80}
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
                  justify={'center'}>
                  <MyIcon name="infoCircle" color={'brightBlue.600'} w={'16px'} mr={1} />
                  <Text fontSize={'14px'} fontWeight={'400'} color={'brightBlue.600'}>
                    {t('jetbrains_guide_connecting_info')}
                  </Text>
                </Flex>
              )}
            </Box>
            <Divider />
            <Box py={6}>
              <Text fontWeight={'bold'} fontSize={'lg'} mb={6}>
                {t('jetbrains_guide_post_use')}
              </Text>
              <Text fontSize={'14px'} mb={2}>
                {t('jetbrains_guide_post_connection')}
              </Text>
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
                  window.open('https://www.jetbrains.com/remote-development/gateway/', '_blank')
                }}>
                {t('jetbrains_guide_documentation')}
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
  )
}
const jetbrainsIDEObj = {
  IntelliJ: {
    label: 'IntelliJ IDEA',
    value: 'intellij'
  },
  PyCharm: {
    label: 'PyCharm',
    value: 'pycharm'
  },
  WebStorm: {
    label: 'WebStorm',
    value: 'webstorm'
  },
  Rider: {
    label: 'Rider',
    value: 'rider'
  },
  CLion: {
    label: 'CLion',
    value: 'clion'
  },
  GoLand: {
    label: 'GoLand',
    value: 'goland'
  },
  RubyMine: {
    label: 'RubyMine',
    value: 'rubymine'
  },
  PhpStorm: {
    label: 'PhpStorm',
    value: 'phpstorm'
  },
  RustRover: {
    label: 'RustRover',
    value: 'rustover'
  }
}

const runtimeTypeToIDEType = (runtimeType: string) => {
  switch (runtimeType) {
    // Python
    case 'python':
    case 'django':
    case 'flask':
      return jetbrainsIDEObj.PyCharm

    // Go
    case 'go':
    case 'gin':
    case 'echo':
    case 'hertz':
    case 'iris':
    case 'chi':
      return jetbrainsIDEObj.GoLand

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
      return jetbrainsIDEObj.WebStorm

    // C/C++
    case 'c':
    case 'cpp':
      return jetbrainsIDEObj.CLion

    // Java
    case 'java':
    case 'quarkus':
    case 'vert.x':
    case 'spring-boot':
      return jetbrainsIDEObj.IntelliJ

    // PHP
    case 'php':
    case 'laravel':
      return jetbrainsIDEObj.PhpStorm

    // Ruby
    case 'ruby':
    case 'rails':
      return jetbrainsIDEObj.RubyMine

    // Rust
    case 'rust':
    case 'rocket':
      return jetbrainsIDEObj.RustRover

    // other
    case 'debian-ssh':
    case 'custom':
    default:
      return jetbrainsIDEObj.IntelliJ
  }
}

export default JetBrainsGuideModal
