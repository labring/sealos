import {
  Box,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  Flex,
  Text,
  Button,
  Divider,
  Stepper,
  Step,
  StepIndicator,
  StepNumber,
  StepStatus,
  StepSeparator,
  Circle
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

import Code from '../Code'
import MyIcon from '../Icon'
import { useState } from 'react'

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

const SshConnectModal = ({
  onClose
}: {
  onSuccess: () => void
  onClose: () => void
  jetbrainsGuideData: JetBrainsGuideData
}) => {
  const t = useTranslations()

  const [onOpenScripts1, setOnOpenScripts1] = useState(false)
  const [onOpenScripts2, setOnOpenScripts2] = useState(false)
  const [onOpenScripts3, setOnOpenScripts3] = useState(false)

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent top={'5%'} maxWidth={'800px'} w={'700px'} h={'80%'} position={'relative'}>
          <ModalHeader pl={10}>{t('jetbrains_guide_config_ssh')}</ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} />
          <ModalBody pb={6} overflowY={'auto'}>
            <Flex flexDirection={'column'} gap={4}>
              <Text fontSize={'18px'} fontWeight={500} color={'grayModern.900'}>
                {t('jetbrains_guide_one_click_setup')}
              </Text>
              <Text fontSize={'14px'} color={'grayModern.900'} fontWeight={400} lineHeight={'20px'}>
                {t.rich('jetbrains_guide_one_click_setup_desc', {
                  blue: (chunks) => (
                    <Text fontWeight={'bold'} display={'inline-block'} color={'brightBlue.600'}>
                      {chunks}
                    </Text>
                  ),
                  lightColor: (chunks) => (
                    <Text display={'inline-block'} color={'grayModern.600'}>
                      {chunks}
                    </Text>
                  )
                })}
              </Text>
              <Button
                leftIcon={<MyIcon name="download" color={'grayModern.500'} w={'16px'} />}
                w={'fit-content'}
                bg={'white'}
                color={'grayModern.600'}
                border={'1px solid'}
                borderColor={'grayModern.200'}
                borderRadius={'6px'}
                _hover={{
                  color: 'brightBlue.600',
                  '& svg': {
                    color: 'brightBlue.600'
                  }
                }}>
                {t('download_scripts')}
              </Button>
              <Flex
                justifyContent={'space-between'}
                bg={'grayModern.25'}
                p={2}
                borderRadius={'6px'}
                border={'1px solid'}
                borderColor={'grayModern.200'}
                alignItems={'center'}>
                <Box>
                  <Button
                    onClick={() => setOnOpenScripts1(!onOpenScripts1)}
                    bg={'transparent'}
                    border={'none'}
                    boxShadow={'none'}
                    color={'grayModern.900'}
                    fontWeight={400}
                    leftIcon={<MyIcon name="arrowDown" color={'grayModern.500'} w={'16px'} />}
                    _hover={{
                      color: 'brightBlue.600',
                      '& svg': {
                        color: 'brightBlue.600'
                      }
                    }}>
                    Bash
                  </Button>
                </Box>
                <Box>
                  <Button
                    bg={'transparent'}
                    border={'none'}
                    boxShadow={'none'}
                    color={'grayModern.900'}
                    _hover={{
                      color: 'brightBlue.600',
                      '& svg': {
                        color: 'brightBlue.600'
                      }
                    }}>
                    <MyIcon name="copy" color={'grayModern.600'} w={'16px'} />
                  </Button>
                </Box>
              </Flex>
              {onOpenScripts1 && <Code content={'test'} language="bash" />}
            </Flex>
            <Divider my={6} />
            <Stepper orientation="vertical" index={-1} mt={4} gap={0} position={'relative'}>
              {/* 1 */}
              <Step>
                <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                  <StepStatus incomplete={<StepNumber />} />
                </StepIndicator>
                <Box mt={1} ml={2} mb={5}>
                  <Box fontSize={'14px'} mb={3}>
                    {t.rich('jetbrains_guide_download_private_key', {
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
                      window.open('https://code-with-me.jetbrains.com/remoteDev', '_blank')
                    }}>
                    {t('download_private_key')}
                  </Button>
                </Box>
                <StepSeparator />
              </Step>
              {/* 2 */}
              <Step>
                <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                  <StepStatus incomplete={<StepNumber />} />
                </StepIndicator>
                <Flex mt={1} ml={2} mb={5}>
                  <Box fontSize={'14px'}>
                    {t.rich('jetbrains_guide_move_to_path', {
                      blue: (chunks) => (
                        <Text fontWeight={'bold'} display={'inline-block'} color={'brightBlue.600'}>
                          {chunks}
                        </Text>
                      )
                    })}
                  </Box>
                  <Button
                    bg={'transparent'}
                    border={'none'}
                    boxShadow={'none'}
                    color={'grayModern.900'}
                    _hover={{
                      color: 'brightBlue.600',
                      '& svg': {
                        color: 'brightBlue.600'
                      }
                    }}
                    ml={2}>
                    <MyIcon name="copy" color={'grayModern.500'} w={'16px'} />
                  </Button>
                </Flex>
                <StepSeparator />
              </Step>
              {/* 3 */}
              <Step>
                <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                  <StepStatus incomplete={<StepNumber />} />
                </StepIndicator>
                <Flex mt={1} ml={2} mb={5}>
                  <Box fontSize={'14px'}>
                    {t.rich('jetbrains_guide_modified_file', {
                      blue: (chunks) => (
                        <Text fontWeight={'bold'} display={'inline-block'} color={'brightBlue.600'}>
                          {chunks}
                        </Text>
                      )
                    })}
                  </Box>
                  <Flex
                    justifyContent={'space-between'}
                    bg={'grayModern.25'}
                    p={2}
                    borderRadius={'6px'}
                    border={'1px solid'}
                    borderColor={'grayModern.200'}
                    alignItems={'center'}>
                    <Box>
                      <Button
                        onClick={() => setOnOpenScripts2(!onOpenScripts2)}
                        bg={'transparent'}
                        border={'none'}
                        boxShadow={'none'}
                        color={'grayModern.900'}
                        fontWeight={400}
                        leftIcon={<MyIcon name="arrowDown" color={'grayModern.500'} w={'16px'} />}
                        _hover={{
                          color: 'brightBlue.600',
                          '& svg': {
                            color: 'brightBlue.600'
                          }
                        }}>
                        Bash
                      </Button>
                    </Box>
                    <Box>
                      <Button
                        bg={'transparent'}
                        border={'none'}
                        boxShadow={'none'}
                        color={'grayModern.900'}
                        _hover={{
                          color: 'brightBlue.600',
                          '& svg': {
                            color: 'brightBlue.600'
                          }
                        }}>
                        <MyIcon name="copy" color={'grayModern.600'} w={'16px'} />
                      </Button>
                    </Box>
                  </Flex>
                  {onOpenScripts2 && <Code content={'test'} language="bash" />}
                </Flex>
                <StepSeparator />
              </Step>
              {/* 4 */}
              <Step>
                <StepIndicator backgroundColor={'grayModern.100'} borderColor={'grayModern.100'}>
                  <StepStatus incomplete={<StepNumber />} />
                </StepIndicator>
                <Flex mt={1} ml={2} mb={5}>
                  <Box fontSize={'14px'}>{t('jetbrains_guide_command')}</Box>
                  <Flex
                    justifyContent={'space-between'}
                    bg={'grayModern.25'}
                    p={2}
                    borderRadius={'6px'}
                    border={'1px solid'}
                    borderColor={'grayModern.200'}
                    alignItems={'center'}>
                    <Box>
                      <Button
                        onClick={() => setOnOpenScripts3(!onOpenScripts3)}
                        bg={'transparent'}
                        border={'none'}
                        boxShadow={'none'}
                        color={'grayModern.900'}
                        fontWeight={400}
                        leftIcon={<MyIcon name="arrowDown" color={'grayModern.500'} w={'16px'} />}
                        _hover={{
                          color: 'brightBlue.600',
                          '& svg': {
                            color: 'brightBlue.600'
                          }
                        }}>
                        Bash
                      </Button>
                    </Box>
                    <Box>
                      <Button
                        bg={'transparent'}
                        border={'none'}
                        boxShadow={'none'}
                        color={'grayModern.900'}
                        _hover={{
                          color: 'brightBlue.600',
                          '& svg': {
                            color: 'brightBlue.600'
                          }
                        }}>
                        <MyIcon name="copy" color={'grayModern.600'} w={'16px'} />
                      </Button>
                    </Box>
                  </Flex>
                  {onOpenScripts3 && <Code content={'test'} language="bash" />}
                </Flex>
                <StepSeparator />
              </Step>
              {/* done */}
              <Step>
                <Circle size="10px" bg="grayModern.100" top={-3} left={2.5} position={'absolute'} />
              </Step>
            </Stepper>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default SshConnectModal
