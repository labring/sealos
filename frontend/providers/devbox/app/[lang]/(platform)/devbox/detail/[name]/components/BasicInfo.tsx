import React, { useCallback, useState } from 'react'
import MyIcon from '@/components/Icon'
import { useTranslations } from 'next-intl'
import { useDevboxStore } from '@/stores/devbox'
import { Box, Text, Grid, GridItem, Flex, Image, Spinner } from '@chakra-ui/react'
import { getRuntimeVersionItem, NAMESPACE, REGISTRY_ADDR, SEALOS_DOMAIN } from '@/stores/static'
import { getSSHConnectionInfo } from '@/api/devbox'
import { DevboxDetailType } from '@/types/devbox'

const BasicInfo = () => {
  const { devboxDetail, devboxDetailPods } = useDevboxStore()
  const [loading, setLoading] = useState(false)
  const t = useTranslations()

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
            <Text>{`${REGISTRY_ADDR}/${NAMESPACE}/${devboxDetail?.name}`}</Text>
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
            <Text>{`ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${SEALOS_DOMAIN} -p ${devboxDetail.sshPort}`}</Text>
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
              <MyIcon
                cursor={'pointer'}
                name="download"
                w={'20px'}
                h={'20px'}
                onClick={() => handleDownloadConfig(devboxDetail?.sshConfig)}
              />
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
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text>{t('none')}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default BasicInfo
