import { listOfficialTemplateRepository } from '@/api/template'
import { TemplateRepositoryKind } from '@/prisma/generated/client'
import { useDevboxStore } from '@/stores/devbox'
import { DevboxEditTypeV2 } from '@/types/devbox'
import { TemplateRepository } from '@/types/template'
import { Box, Flex, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import Label from '../../Label'
import TemplateRepositoryListNav from '../TemplateRepositoryListNav'
import TemplateRepositoryItem from './TemplateReposistoryItem'

interface TemplateRepositorySelectorProps {
  isEdit: boolean
}

export default function TemplateRepositorySelector({
  isEdit,
}: TemplateRepositorySelectorProps) {

  const t = useTranslations()
  const templateRepositoryQuery = useQuery(['list-official-template-repository'], listOfficialTemplateRepository, {
    staleTime: 1000 * 60,
  })
  const { startedTemplate, setStartedTemplate } = useDevboxStore()
  const { setValue } = useFormContext<DevboxEditTypeV2>()

  const templateData = useMemo(() => templateRepositoryQuery.data?.templateRepositoryList || [], [templateRepositoryQuery.data])
  const categorizedData = useMemo(() => {
    return templateData.reduce((acc, item) => {
      acc[item.kind] = [...(acc[item.kind] || []), item]
      return acc
    }, {
      'LANGUAGE': [],
      'FRAMEWORK': [],
      'OS': [],
      'CUSTOM': []
    } as Record<TemplateRepositoryKind, TemplateRepository[]>)
  }, [templateData])
  useEffect(() => {
    if(!startedTemplate) return
    const templateUid = startedTemplate.uid
    if(templateData.findIndex((item) => {
      return item.uid === templateUid
    }) > -1) {
      setStartedTemplate(undefined)
    }
    setValue('templateRepositoryUid', templateUid)
  }, [startedTemplate])
  return (
    <VStack alignItems={'center'} mb={7} gap={'24px'}>
      <Flex w='full' justify={'space-between'}>
        <Label w={100} alignSelf={'flex-start'}>
          {t('runtime_environment')}
        </Label>
        <TemplateRepositoryListNav />
      </Flex>
      {!!startedTemplate && <Flex gap={'10px'} px={'14px'} width={'full'}>
        <Box width={'85px'}>{t('current')}</Box>
        <Flex flexWrap={'wrap'} gap={'12px'} flex={1}>
          <TemplateRepositoryItem item={{
            uid: startedTemplate.uid,
            iconId: startedTemplate.iconId || '',
            name: startedTemplate.name,
          }} isEdit={isEdit} />
        </Flex>
      </Flex>}
      <Flex gap={'10px'} px={'14px'} width={'full'}>
        {/* Language */}
        {categorizedData['LANGUAGE'].length !== 0 && <Box width={'85px'}>{t('language')}</Box>}
        <Flex flexWrap={'wrap'} gap={'12px'} flex={1}>
          {categorizedData['LANGUAGE']?.map((item) => (
            <TemplateRepositoryItem key={item.uid} item={item} isEdit={isEdit} />
          ))}
        </Flex>
      </Flex>
      <Flex gap={'10px'} px={'14px'} width={'full'}>
        {/* Framework */}
        {categorizedData['FRAMEWORK'].length !== 0 && <Box width={'85px'}>{t('framework')}</Box>}
        <Flex flexWrap={'wrap'} gap={'12px'} flex={1}>
          {categorizedData['FRAMEWORK']?.map((item) => (
            <TemplateRepositoryItem key={item.uid} item={item} isEdit={isEdit} />
          ))}
        </Flex>
      </Flex>
      <Flex gap={'10px'} px={'14px'} width={'full'}>
        {/* OS */}
        {categorizedData['OS'].length !== 0 && <Box width={'85px'}>{t('os')}</Box>}
        <Flex flexWrap={'wrap'} gap={'12px'} flex={1}>
          {categorizedData['OS']?.map((item) => (
            <TemplateRepositoryItem key={item.uid} item={item} isEdit={isEdit} />
          ))}
        </Flex>
      </Flex>
    </VStack>
  )
}

