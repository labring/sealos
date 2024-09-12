import React, { useCallback, useState } from 'react'
import MyIcon from '@/components/Icon'
import { useTranslations } from 'next-intl'
import { useDevboxStore } from '@/stores/devbox'
import { Box, Text, Grid, GridItem, Flex, Image, Spinner } from '@chakra-ui/react'
import { getRuntimeVersionItem, NAMESPACE, REGISTRY_ADDR, SEALOS_DOMAIN } from '@/stores/static'
import { getSSHConnectionInfo } from '@/api/devbox'

const Status = () => {
  const { devboxDetail, devboxDetailPods } = useDevboxStore()
  const [loading, setLoading] = useState(false)
  const t = useTranslations()

  const handleDownloadConfig = useCallback(async () => {
    setLoading(true)
    const { base64PublicKey, base64PrivateKey, userName } = await getSSHConnectionInfo({
      devboxName: devboxDetail.name,
      runtimeName: devboxDetail.runtimeVersion
    })

    const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8')

    const config = {
      sshDomain: `${userName}@${SEALOS_DOMAIN}`,
      sshPort: devboxDetail.sshPort,
      sshPrivateKey
    }

    const configStr = JSON.stringify(config, null, 2)
    const blob = new Blob([configStr], { type: 'application/json' })
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
  }, [devboxDetail])

  return (
    <Grid
      mt={5}
      bg={'white'}
      borderRadius="lg"
      borderWidth={1}
      p={4}
      gap={4}
      templateColumns={['1fr', '1fr 1fr', 'repeat(3, 1fr)', 'repeat(4, 1fr)']}>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('runtime')}
          </Text>
          <Flex alignItems="center" width="60%">
            <Text>{devboxDetail?.runtimeType}</Text>
            <Image
              ml={2}
              width={'20px'}
              height={'20px'}
              alt={devboxDetail?.runtimeType}
              src={`/images/${devboxDetail?.runtimeType}.svg`}
            />
          </Flex>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('create_time')}
          </Text>
          <Text width="60%">{devboxDetail?.createTime}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('download_config')}
          </Text>
          <Box width="60%">
            {loading ? (
              <Spinner size="sm" color="#0077A9" />
            ) : (
              <MyIcon name="download" w={'20px'} h={'20px'} onClick={handleDownloadConfig} />
            )}
          </Box>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('cpu')}
          </Text>
          <Text width="60%">{devboxDetail?.cpu} Core</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('version')}
          </Text>
          <Text width="60%">
            {getRuntimeVersionItem(devboxDetail?.runtimeType, devboxDetail?.runtimeVersion)?.label}
          </Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('start_time')}
          </Text>
          <Text width="60%">{devboxDetail?.upTime}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('image')}
          </Text>
          <Text width="60%">{`${REGISTRY_ADDR}/${NAMESPACE}/${devboxDetail?.name}`}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="40%" flexShrink={0}>
            {t('memory')}
          </Text>
          <Text width="60%">{devboxDetail?.memory} G</Text>
        </Flex>
      </GridItem>
    </Grid>
  )
}

export default Status
