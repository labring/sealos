import React from 'react'
import MyIcon from '@/components/Icon'
import MyTable from '@/components/MyTable'
import { useTranslations } from 'next-intl'
import { useDevboxStore } from '@/stores/devbox'
import PodLineChart from '@/components/PodLineChart'
import { Box, Text, Grid, GridItem, Flex, Image } from '@chakra-ui/react'
import { NAMESPACE, REGISTRY_ADDR } from '@/stores/static'

const Status = () => {
  const { devboxDetail } = useDevboxStore()
  // console.log('devboxDetail', devboxDetail)
  const t = useTranslations()

  return (
    <Grid
      mt={5}
      bg={'white'}
      borderRadius="lg"
      borderWidth={1}
      p={4}
      gap={4}
      templateColumns="repeat(auto-fill, minmax(200px, 1fr))">
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('runtime')}
          </Text>
          <Flex alignItems="center" width="50%">
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
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('create_time')}
          </Text>
          <Text width="50%">{devboxDetail?.createTime}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('download_config')}
          </Text>
          <Box width="50%">
            <MyIcon name="download" w={'20px'} h={'20px'} />
          </Box>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('cpu')}
          </Text>
          <Text width="50%">{devboxDetail?.cpu} Core</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('version')}
          </Text>
          <Text width="50%">{devboxDetail?.runtimeVersion}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('start_time')}
          </Text>
          <Text width="50%">{devboxDetail?.startTime}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('image')}
          </Text>
          <Text width="50%">{`${REGISTRY_ADDR}/${NAMESPACE}/${devboxDetail?.name}`}</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Flex alignItems="center" height="100%">
          <Text fontSize="lg" fontWeight="bold" width="50%" flexShrink={0}>
            {t('memory')}
          </Text>
          <Text width="50%">{devboxDetail?.memory} G</Text>
        </Flex>
      </GridItem>
    </Grid>
  )
}

export default Status
