'use client'
import { Button, Flex, Text, useDisclosure } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { Switch } from '@chakra-ui/react'
import { EditableText } from './EditableText'
import { getOption, updateOption } from '@/api/platform'
import { useMessage } from '@sealos/ui'
import { QueryKey } from '@/types/query-key'
import { useState } from 'react'
import { produce } from 'immer'

export enum CommonConfigKey {
  GlobalApiRateLimitNum = 'GlobalApiRateLimitNum',
  DisableServe = 'DisableServe',
  RetryTimes = 'RetryTimes',
  GroupMaxTokenNum = 'GroupMaxTokenNum'
}

type CommonConfig = {
  [CommonConfigKey.GlobalApiRateLimitNum]: string
  [CommonConfigKey.DisableServe]: string
  [CommonConfigKey.RetryTimes]: string
  [CommonConfigKey.GroupMaxTokenNum]: string
}

const CommonConfig = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const queryClient = useQueryClient()

  const [commonConfig, setCommonConfig] = useState<CommonConfig>(() =>
    produce({} as CommonConfig, (draft) => {
      draft.GlobalApiRateLimitNum = ''
      draft.DisableServe = ''
      draft.RetryTimes = ''
      draft.GroupMaxTokenNum = ''
    })
  )

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const { isLoading: isOptionLoading, data: optionData } = useQuery({
    queryKey: [QueryKey.GetCommonConfig],
    queryFn: () => getOption(),
    onSuccess: (data) => {
      if (!data) return

      setCommonConfig(
        produce(commonConfig, (draft) => {
          draft.GlobalApiRateLimitNum = data.GlobalApiRateLimitNum || ''
          draft.DisableServe = data.DisableServe || ''
          draft.RetryTimes = data.RetryTimes || ''
          draft.GroupMaxTokenNum = data.GroupMaxTokenNum || ''
        })
      )
    }
  })

  const updateOptionMutation = useMutation({
    mutationFn: (params: { key: string; value: string }) => updateOption(params),
    onSuccess: () => {
      message({
        title: t('globalConfigs.saveCommonConfigSuccess'),
        status: 'success'
      })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetCommonConfig] })
    },
    onError: () => {
      message({
        title: t('globalConfigs.saveCommonConfigFailed'),
        status: 'error'
      })
    }
  })

  const updateConfigField = (field: CommonConfigKey, value: string) => {
    setCommonConfig(
      produce((draft) => {
        draft[field] = value
      })
    )
    updateOptionMutation.mutate({ key: field, value })
  }

  const handleDisableServeChange = (checked: boolean) => {
    const value = checked ? 'true' : 'false'
    updateConfigField(CommonConfigKey.DisableServe, value)
  }

  return (
    /*
    h = 72px + 20px + 60px = 152px
    EditableText (24px × 3) = 72px
    Switch container (20px) = 20px
    gap (20px × 3) = 60px
    */
    <Flex gap="8px" flexDirection="row" w="full">
      {/* title */}
      <Flex w="153px" alignItems="flex-start">
        <Text
          // whiteSpace="nowrap"
          color="black"
          fontFamily="PingFang SC"
          fontSize="16px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="24px"
          letterSpacing="0.15px">
          {t('globalConfigs.common_config')}
        </Text>
      </Flex>
      {/* -- title end */}

      {/* config */}

      <Flex flexDirection="column" gap="20px" flex="1" minW="0">
        {/* QPM Limit */}
        <EditableText
          label={t('global_configs.qpm_limit')}
          value={commonConfig.GlobalApiRateLimitNum}
          onSubmit={(value) => updateConfigField(CommonConfigKey.GlobalApiRateLimitNum, value)}
          flexProps={{ h: '24px' }}
        />

        {/* Pause Service */}
        <Flex alignItems="center" gap="16px" h="20px">
          <Text flex="1">{t('global_configs.pause_service')}</Text>
          <Switch
            size="md"
            isChecked={commonConfig.DisableServe === 'true'}
            onChange={(e) => handleDisableServeChange(e.target.checked)}
          />
        </Flex>

        {/* Retry Count */}
        <EditableText
          label={t('global_configs.retry_count')}
          value={commonConfig.RetryTimes}
          onSubmit={(value) => updateConfigField(CommonConfigKey.RetryTimes, value)}
          flexProps={{ h: '24px' }}
        />

        {/* Max Token */}
        <EditableText
          label={t('global_configs.max_token')}
          value={commonConfig.GroupMaxTokenNum}
          onSubmit={(value) => updateConfigField(CommonConfigKey.GroupMaxTokenNum, value)}
          flexProps={{ h: '24px' }}
        />
      </Flex>

      {/* -- config end */}
    </Flex>
  )
}

export default CommonConfig
