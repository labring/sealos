import React, { useCallback, useState } from 'react'
import MyIcon from '@/components/Icon'
import { useTranslations } from 'next-intl'
import { useDevboxStore } from '@/stores/devbox'
import { Box, Text, Flex, Image, Spinner, Tooltip } from '@chakra-ui/react'
import { getRuntimeVersionItem, NAMESPACE, REGISTRY_ADDR, SEALOS_DOMAIN } from '@/stores/static'
import { DevboxDetailType } from '@/types/devbox'
import { useMessage } from '@sealos/ui'

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

      const blob = new Blob([privateKey], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${devboxDetail.name}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setLoading(false)
    },
    [devboxDetail]
  )

  return (
    <Flex borderRadius="lg" bg={'white'} p={4} flexDirection={'column'}>
      {/* basic info */}
      <Flex mb={2}>
        <MyIcon name="info" w={'20px'} h={'20px'} mr={'4px'} color={'grayModern.600'} mt={'1px'} />
        <Box color={'grayModern.600'} fontSize={'lg'} fontWeight={'bold'}>
          {t('basic_info')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('name')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{devboxDetail?.name}</Text>
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
          <Text mr={2} width={'40%'}>
            {t('image_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text w={'full'}>{`${REGISTRY_ADDR}/${NAMESPACE}/${devboxDetail?.name}`}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('create_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{devboxDetail?.createTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('start_runtime')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>
              {getRuntimeVersionItem(devboxDetail?.runtimeType, devboxDetail?.runtimeVersion)}
            </Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('start_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{devboxDetail?.upTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
            Limit CPU
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{devboxDetail?.cpu} Core</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
            Limit Memory
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{devboxDetail?.memory} G</Text>
          </Flex>
        </Flex>
      </Flex>
      {/* ssh config */}
      <Flex mb={2} mt={4}>
        <MyIcon name="link" w={'20px'} h={'20px'} mr={'4px'} color={'grayModern.600'} mt={'2px'} />
        <Box color={'grayModern.600'} fontSize={'lg'} fontWeight={'bold'}>
          {t('ssh_config')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('ssh_connect_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Tooltip
              label={t('copy')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'38px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}>
              <Text
                cursor="pointer"
                _hover={{ color: 'blue.500' }}
                onClick={handleCopySSHCommand}
                w={'full'}>
                {`ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${SEALOS_DOMAIN} -p ${devboxDetail.sshPort}`}
              </Text>
            </Tooltip>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'}>
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
                <Flex>
                  <MyIcon
                    cursor={'pointer'}
                    name="export"
                    w={'20px'}
                    h={'20px'}
                    onClick={() => handleDownloadConfig(devboxDetail?.sshConfig)}
                  />
                </Flex>
              </Tooltip>
            )}
          </Flex>
        </Flex>
      </Flex>
      {/* event */}
      <Flex mb={2} mt={4}>
        <MyIcon
          name="response"
          w={'20px'}
          h={'20px'}
          mr={'4px'}
          color={'grayModern.600'}
          mt={'4px'}
        />
        <Box color={'grayModern.600'} fontSize={'lg'} fontWeight={'bold'}>
          {t('event')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'}>
            {t('recent_error')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'} alignItems={'center'}>
            {devboxDetail?.lastTerminatedState?.reason ? (
              <Text>{devboxDetail?.lastTerminatedState?.reason}</Text>
            ) : (
              <Text>{t('none')}</Text>
            )}
            <Tooltip
              label={t('read_event_detail')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'88px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}>
              <Flex>
                <MyIcon
                  cursor={'pointer'}
                  name="maximize"
                  w={'20px'}
                  h={'20px'}
                  ml={3}
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
