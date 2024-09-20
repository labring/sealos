import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import React, { useCallback, useState } from 'react'
import { Box, Text, Flex, Image, Spinner, Tooltip } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'
import { useDevboxStore } from '@/stores/devbox'
import { DevboxDetailType } from '@/types/devbox'
import { getRuntimeVersionItem, NAMESPACE, REGISTRY_ADDR, SEALOS_DOMAIN } from '@/stores/static'

const BasicInfo = () => {
  const { devboxDetail } = useDevboxStore()
  const [loading, setLoading] = useState(false)
  const t = useTranslations()
  const { message: toast } = useMessage()

  const handleCopySSHCommand = useCallback(() => {
    const sshCommand = `ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${SEALOS_DOMAIN} -p ${devboxDetail.sshPort}`
    navigator.clipboard.writeText(sshCommand).then(() => {
      toast({
        title: t('copy_success'),
        status: 'success',
        duration: 2000,
        isClosable: true
      })
    })
  }, [devboxDetail, toast, t])

  const handleDownloadConfig = useCallback(
    async (config: DevboxDetailType['sshConfig']) => {
      setLoading(true)

      const privateKey = config?.sshPrivateKey as string

      const blob = new Blob([privateKey], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = devboxDetail.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setLoading(false)
    },
    [devboxDetail]
  )

  return (
    <Flex borderRadius="lg" bg={'white'} p={4} flexDirection={'column'} borderWidth={1} h={'100%'}>
      {/* basic info */}
      <Flex mb={3} mt={2}>
        <MyIcon name="info" w={'15px'} h={'15px'} mr={'4px'} color={'grayModern.600'} mt={'1px'} />
        <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
          {t('basic_info')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('name')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.name}</Text>
            <Image
              ml={2}
              width={'20px'}
              height={'20px'}
              alt={devboxDetail?.runtimeType}
              src={`/images/${devboxDetail?.runtimeType}.svg`}
            />
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('image_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text
              fontSize={'12px'}
              w={'full'}>{`${REGISTRY_ADDR}/${NAMESPACE}/${devboxDetail?.name}`}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('create_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.createTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('start_runtime')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>
              {getRuntimeVersionItem(devboxDetail?.runtimeType, devboxDetail?.runtimeVersion)}
            </Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('start_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.upTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            Limit CPU
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.cpu / 1000} Core</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            Limit Memory
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.memory / 1024} G</Text>
          </Flex>
        </Flex>
      </Flex>
      {/* ssh config */}
      <Flex mb={3} mt={4}>
        <MyIcon
          name="link"
          w={'15px'}
          h={'15px'}
          mr={'4px'}
          color={'grayModern.600'}
          mt={'1px'}
          ml={'1px'}
        />
        <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
          {t('ssh_config')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('ssh_connect_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Tooltip
              label={t('copy')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'45px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}>
              <Text
                cursor="pointer"
                fontSize={'12px'}
                _hover={{ color: 'blue.500' }}
                onClick={handleCopySSHCommand}
                w={'full'}>
                {`ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${SEALOS_DOMAIN} -p ${devboxDetail.sshPort}`}
              </Text>
            </Tooltip>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('private_key')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            {loading ? (
              <Spinner size="sm" color="#0077A9" />
            ) : (
              <Tooltip
                label={t('export_privateKey')}
                hasArrow
                bg={'#FFFFFF'}
                color={'grayModern.900'}
                fontSize={'12px'}
                fontWeight={400}
                py={2}
                borderRadius={'md'}>
                <Flex
                  p={1}
                  borderRadius={'6px'}
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }}>
                  <MyIcon
                    cursor={'pointer'}
                    name="download"
                    w={'16px'}
                    h={'16px'}
                    onClick={() => handleDownloadConfig(devboxDetail?.sshConfig)}
                  />
                </Flex>
              </Tooltip>
            )}
          </Flex>
        </Flex>
      </Flex>
      {/* event */}
      <Flex mb={3} mt={4}>
        <MyIcon
          name="response"
          w={'15px'}
          h={'15px'}
          mr={'4px'}
          color={'grayModern.600'}
          mt={'2px'}
        />
        <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
          {t('event')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('recent_error')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'} alignItems={'center'}>
            {devboxDetail?.lastTerminatedState?.reason ? (
              <Text fontSize={'12px'}>{devboxDetail?.lastTerminatedState?.reason}</Text>
            ) : (
              <Text fontSize={'12px'}>{t('none')}</Text>
            )}
            <Tooltip
              label={t('read_event_detail')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'120px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}>
              <Flex
                ml={3}
                p={1}
                borderRadius={'6px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.05)'
                }}>
                <MyIcon
                  cursor={'pointer'}
                  name="maximize"
                  w={'16px'}
                  h={'16px'}
                  color={'grayModern.600'}
                  mt={'1px'}
                  onClick={() => {
                    console.log('click')
                  }}
                />
              </Flex>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default BasicInfo
