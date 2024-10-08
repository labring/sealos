import JSZip from 'jszip'
import dayjs from 'dayjs'
import React, { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Box, Flex, Button } from '@chakra-ui/react'

import { useRouter } from '@/i18n'
import MyIcon from '@/components/Icon'
import { downLoadBlob } from '@/utils/tools'
import { useGlobalStore } from '@/stores/global'
import type { YamlItemType } from '@/types/index'

const Header = ({
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  yamlList: YamlItemType[]
  applyCb: () => void
  title: string
  applyBtnText: string
}) => {
  const router = useRouter()
  const { lastRoute } = useGlobalStore()
  const t = useTranslations()

  const handleExportYaml = useCallback(async () => {
    const zip = new JSZip()
    yamlList.forEach((item) => {
      zip.file(item.filename, item.value)
    })
    const res = await zip.generateAsync({ type: 'blob' })
    downLoadBlob(res, 'application/zip', `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`)
  }, [yamlList])

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace(lastRoute)}>
        <MyIcon name="arrowLeft" width={'24px'} height={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button h={'40px'} flex={'0 0 114px'} mr={5} variant={'outline'} onClick={handleExportYaml}>
        {t('export_yaml')}
      </Button>
      <Button flex={'0 0 114px'} h={'40px'} variant={'solid'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  )
}

export default Header
