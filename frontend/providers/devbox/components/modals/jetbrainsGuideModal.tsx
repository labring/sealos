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
  base64PrivateKey: string
  userName: string
  token: string
  workingDir: string
  host: string
  port: string
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
    const privateKey = jetbrainsGuideData.base64PrivateKey

    const blob = new Blob([privateKey], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = 'private_key' // TODO: change to devbox name
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
                  {t('jetbrains_guide_four_steps')}
                </Text>
              </Flex>
              <Stepper orientation="vertical" index={-1} mt={4} gap={0} position={'relative'}>
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Box mt={1} ml={2} mb={5}>
                    <Text fontSize={'14px'} mb={2}>
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
                    </Text>
                    <Image
                      src={'/images/jetbrains/step1.png'}
                      alt="step1"
                      width={600}
                      height={100}
                    />
                  </Box>
                  <StepSeparator />
                </Step>
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Flex flexShrink="0" mt={1} ml={2} gap={4} direction={'column'}>
                    <Flex direction={'column'} gap={1}>
                      <Flex alignItems={'center'} gap={2} mb={2}>
                        <Circle size="6px" bg="#47B2FF" />
                        <Text fontSize={'14px'}>
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
                        </Text>
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
                            onClick={() => copyData(jetbrainsGuideData.userName)}
                            w={'16px'}
                            ml={2}
                            color={'grayModern.600'}
                          />
                        </GridItem>
                        <GridItem color={'grayModern.600'}>Host:</GridItem>
                        <GridItem>
                          {jetbrainsGuideData.host}
                          <MyIcon
                            name="copy"
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
                        <Text fontSize={'md'}>
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
                        </Text>
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
                        <Text fontSize={'md'} wordBreak={'break-word'}>
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
                        </Text>
                      </Flex>
                      <Image
                        src={'/images/jetbrains/step2-3.png'}
                        alt="step2-3"
                        width={600}
                        height={100}
                      />
                    </Flex>
                  </Flex>
                  <StepSeparator />
                </Step>
                <Step>
                  <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                    <StepStatus incomplete={<StepNumber />} />
                  </StepIndicator>
                  <Box mt={1} ml={2} mb={5}>
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Text fontSize={'14px'}>
                        {t.rich('jetbrains_guide_step_3_1', {
                          ideVersion: 'IntelliJ IDEA',
                          blue: (chunks) => (
                            <Text
                              fontWeight={'bold'}
                              display={'inline-block'}
                              color={'brightBlue.600'}>
                              {chunks}
                            </Text>
                          )
                        })}
                      </Text>
                    </Flex>
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Text fontSize={'14px'}>
                        {t.rich('jetbrains_guide_step_3_2', {
                          projectPath: 'XXX',
                          blue: (chunks) => (
                            <Text
                              fontWeight={'bold'}
                              display={'inline-block'}
                              color={'brightBlue.600'}>
                              {chunks}
                            </Text>
                          )
                        })}
                      </Text>
                    </Flex>
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Text fontSize={'14px'}>
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
                      </Text>
                    </Flex>
                    <Image
                      src={'/images/jetbrains/step3-3.png'}
                      alt="step1"
                      width={600}
                      height={100}
                    />
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Text fontSize={'14px'}>{t('jetbrains_guide_step_3_4')}</Text>
                    </Flex>
                    <Image
                      src={'/images/jetbrains/step3-4.png'}
                      alt="step1"
                      width={600}
                      height={100}
                    />
                    <Flex alignItems={'center'} gap={2} mb={2}>
                      <Circle size="6px" bg="#47B2FF" />
                      <Text fontSize={'14px'}>
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
                      </Text>
                    </Flex>
                    <Image
                      src={'/images/jetbrains/step3-4.png'}
                      alt="step1"
                      width={600}
                      height={100}
                    />
                  </Box>
                  <StepSeparator />
                </Step>
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
