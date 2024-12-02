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
  Circle
} from '@chakra-ui/react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import MyIcon from '../Icon'
import { useCopyData } from '@/utils/tools'
import { useCallback } from 'react'

interface JetBrainsGuideData {
  devboxName: string
  runtimeType: string
  privateKey: string
  userName: string
  token: string
  workingDir: string
  host: string
  port: string
}

enum IDEType {
  IntelliJ = 'IntelliJ IDEA',
  PyCharm = 'PyCharm',
  WebStorm = 'WebStorm',
  Rider = 'Rider',
  CLion = 'CLion',
  GoLand = 'GoLand',
  RubyMine = 'RubyMine',
  PhpStorm = 'PhpStorm',
  RustRover = 'RustRover'
}

const runtimeTypeToIDEType = (runtimeType: string) => {
  switch (runtimeType) {
    // Python
    case 'python':
    case 'django':
    case 'flask':
      return IDEType.PyCharm

    // Go
    case 'go':
    case 'gin':
    case 'echo':
    case 'hertz':
    case 'iris':
    case 'chi':
      return IDEType.GoLand

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
      return IDEType.WebStorm

    // C/C++
    case 'c':
    case 'cpp':
      return IDEType.CLion

    // Java
    case 'java':
    case 'quarkus':
    case 'vert.x':
    case 'spring-boot':
      return IDEType.IntelliJ

    // PHP
    case 'php':
    case 'laravel':
      return IDEType.PhpStorm

    // Ruby
    case 'ruby':
    case 'rails':
      return IDEType.RubyMine

    // Rust
    case 'rust':
    case 'rocket':
      return IDEType.RustRover

    // other
    case 'debian-ssh':
    case 'custom':
    default:
      return IDEType.IntelliJ
  }
}

const JetBrainsGuideModal = ({
  onSuccess,
  onClose,
  jetbrainsGuideData
}: {
  onSuccess: () => void
  onClose: () => void
  jetbrainsGuideData: JetBrainsGuideData
}) => {
  const t = useTranslations()
  const { copyData } = useCopyData()

  const handleDownloadPrivateKey = useCallback(async () => {
    const privateKey = jetbrainsGuideData.privateKey

    const blob = new Blob([privateKey], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = jetbrainsGuideData.devboxName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, [jetbrainsGuideData])

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent top={'5%'} maxWidth={'800px'} w={'700px'} h={'80%'} position={'relative'}>
          <ModalHeader pl={10}>{t('use_jetbrains')}</ModalHeader>
          <ModalBody pb={6} overflowY={'auto'}>
            {/* prepare */}
            <Box pb={6}>
              <Text fontWeight={'bold'} fontSize={'lg'} mb={6}>
                {t('jetbrains_guide_prepare')}
              </Text>
              <Box fontSize={'14px'} mb={2}>
                {t.rich('jetbrains_guide_prepare_install', {
                  blue: (chunks) => (
                    <Text fontWeight={'bold'} display={'inline-block'} color={'brightBlue.600'}>
                      {chunks}
                    </Text>
                  )
                })}
              </Box>
              <Button
                leftIcon={<MyIcon name="download" color={'grayModern.600'} w={'16px'} />}
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
                JetBrains Gateway
              </Button>
            </Box>
            <Divider />
            <Box pt={6} pb={6}>
              <Flex alignItems={'center'}>
                <Text fontWeight={'bold'} fontSize={'lg'} mr={2}>
                  {t('jetbrains_guide_start_to_use')}
                </Text>
                <Text fontSize={'14px'} color={'grayModern.600'} fontWeight={'bold'}>
                  {t('jetbrains_guide_three_steps')}
                </Text>
              </Flex>
              <Stepper orientation="vertical" index={-1} mt={4} gap={0} position={'relative'}>
                {/* 1 */}
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Box mt={1} ml={2} mb={5}>
                    <Box fontSize={'14px'} mb={2}>
                      {t.rich('jetbrains_guide_step_1', {
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
                    <Image
                      src={'/images/jetbrains/step1.png'}
                      alt="step1"
                      width={600}
                      height={100}
                    />
                  </Box>
                  <StepSeparator />
                </Step>
                {/* 2 */}
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Flex flexShrink="0" mt={1} ml={2} gap={8} direction={'column'} mb={5}>
                    <Flex direction={'column'} gap={1}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Box fontSize={'14px'}>
                          {t.rich('jetbrains_guide_step_2_1', {
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
                      </Flex>
                      <Grid
                        bg={'grayModern.25'}
                        p={'16px'}
                        templateColumns={'1fr 1fr'}
                        borderRadius={'4px'}
                        borderWidth={1}
                        borderColor={'grayModern.200'}
                        w={'369px'}
                        gap={2}>
                        <GridItem color={'grayModern.600'}>Username:</GridItem>
                        <GridItem>
                          {jetbrainsGuideData.userName}
                          <MyIcon
                            name="copy"
                            cursor={'pointer'}
                            onClick={() => copyData(jetbrainsGuideData.userName)}
                            w={'16px'}
                            ml={2}
                            _hover={{ color: '#219BF4' }}
                            color={'grayModern.600'}
                          />
                        </GridItem>
                        <GridItem color={'grayModern.600'}>Host:</GridItem>
                        <GridItem>
                          {jetbrainsGuideData.host}
                          <MyIcon
                            name="copy"
                            _hover={{ color: '#219BF4' }}
                            cursor={'pointer'}
                            onClick={() => copyData(jetbrainsGuideData.host)}
                            w={'16px'}
                            ml={2}
                            color={'grayModern.600'}
                          />
                        </GridItem>
                        <GridItem color={'grayModern.600'}>Port:</GridItem>
                        <GridItem>
                          {jetbrainsGuideData.port}
                          <MyIcon
                            name="copy"
                            _hover={{ color: '#219BF4' }}
                            cursor={'pointer'}
                            onClick={() => copyData(jetbrainsGuideData.port)}
                            w={'16px'}
                            ml={2}
                            color={'grayModern.600'}
                          />
                        </GridItem>
                      </Grid>
                    </Flex>
                    <Flex gap={1} direction={'column'}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Box fontSize={'md'}>
                          {t.rich('jetbrains_guide_step_2_2', {
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
                      </Flex>
                      <Button
                        leftIcon={<MyIcon name="download" color={'grayModern.600'} w={'16px'} />}
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
                        w={'70px'}
                        onClick={handleDownloadPrivateKey}>
                        {t('private_key')}
                      </Button>
                    </Flex>
                    <Flex gap={1} direction={'column'}>
                      <Flex alignItems={'center'} gap={2} mb={2} maxWidth={'600px'}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Box fontSize={'md'} wordBreak={'break-word'}>
                          {t.rich('jetbrains_guide_step_2_3', {
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
                      </Flex>
                      <Box position="relative">
                        <Image
                          src={'/images/jetbrains/step2-3.png'}
                          alt="step2-3"
                          width={578}
                          height={100}
                        />
                        <Box
                          position="absolute"
                          top="95px"
                          left="55px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {jetbrainsGuideData.userName}
                        </Box>
                        <Box
                          position="absolute"
                          top="125px"
                          left="55px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {jetbrainsGuideData.host}
                        </Box>
                        <Box
                          position="absolute"
                          top="150px"
                          left="90px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {t('jetbrains_guide_download_private_key_path')}
                        </Box>
                      </Box>
                    </Flex>
                  </Flex>
                  <StepSeparator />
                </Step>
                {/* 3 */}
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Flex mt={1} ml={2} mb={5} direction={'column'} gap={8}>
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Box fontSize={'14px'}>
                        {t.rich('jetbrains_guide_step_3_1', {
                          ideVersion: runtimeTypeToIDEType(jetbrainsGuideData.runtimeType),
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
                    </Flex>
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Box fontSize={'14px'}>
                        {t.rich('jetbrains_guide_step_3_2', {
                          projectPath: jetbrainsGuideData.workingDir,
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
                    </Flex>
                    <Flex gap={1} direction={'column'}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Box fontSize={'14px'}>
                          {t.rich('jetbrains_guide_step_3_3', {
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
                      </Flex>
                      <Box position="relative">
                        <Image
                          src={'/images/jetbrains/step3-3.png'}
                          alt="step1"
                          width={600}
                          height={100}
                        />
                        <Box
                          position="absolute"
                          top="70px"
                          left="65px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {runtimeTypeToIDEType(jetbrainsGuideData.runtimeType)}
                        </Box>
                        <Box
                          position="absolute"
                          top="105px"
                          left="65px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {jetbrainsGuideData.workingDir}
                        </Box>
                      </Box>
                    </Flex>
                    <Flex gap={1} direction={'column'}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Text fontSize={'14px'}>{t('jetbrains_guide_step_3_4')}</Text>
                      </Flex>
                      <Box position="relative">
                        <Image
                          src={'/images/jetbrains/step3-4.png'}
                          alt="step1"
                          width={600}
                          height={100}
                        />
                        <Box
                          position="absolute"
                          top="70px"
                          left="65px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {runtimeTypeToIDEType(jetbrainsGuideData.runtimeType)}
                        </Box>
                        <Box
                          position="absolute"
                          top="105px"
                          left="65px"
                          px={2}
                          py={1}
                          bg="blackAlpha.800"
                          borderRadius="sm"
                          color={'red'}>
                          {jetbrainsGuideData.workingDir}
                        </Box>
                      </Box>
                    </Flex>
                    <Flex gap={1} direction={'column'}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Box fontSize={'14px'}>
                          {t.rich('jetbrains_guide_step_3_5', {
                            ide: 'IntelliJ IDEA',
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
                      </Flex>
                      <Image
                        src={'/images/jetbrains/step3-5.png'}
                        alt="step1"
                        width={600}
                        height={100}
                      />
                    </Flex>
                  </Flex>
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
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default JetBrainsGuideModal
