'use client'
import { Button, Flex, Text, useDisclosure } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { EditIcon } from '@chakra-ui/icons'
import { Switch } from '@chakra-ui/react'
import { EditableText } from './EditableText'

const CommonConfig = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  return (
    /*
    h = 72px + 20px + 60px = 152px
    EditableText (24px × 3) = 72px
    Switch container (20px) = 20px
    gap (20px × 3) = 60px
    */
    <Flex gap="8px" flexDirection="row" w="full">
      {/* title */}
      <Flex w="153px" pt="4px" alignItems="flex-start">
        <Text
          whiteSpace="nowrap"
          color="black"
          fontFamily="PingFang SC"
          fontSize="16px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="24px"
          letterSpacing="0.15px">
          {t('globalonfigs.common_config')}
        </Text>
      </Flex>
      {/* -- title end */}

      {/* config */}

      <Flex flexDirection="column" gap="20px" flex="1" minW="0">
        {/* QPM Limit */}
        <EditableText
          label={t('global_configs.qpm_limit')}
          value={'12'}
          onSubmit={() => {}}
          flexProps={{ h: '24px' }}
        />

        {/* Pause Service */}
        <Flex alignItems="center" gap="16px" h="20px">
          <Text flex="1">{t('global_configs.pause_service')}</Text>
          <Switch size="md" isChecked={true} onChange={(e) => console.log(e)} />
        </Flex>

        {/* Retry Count */}
        <EditableText
          label={t('global_configs.retry_count')}
          value={'12'}
          onSubmit={() => {}}
          flexProps={{ h: '24px' }}
        />

        {/* Max Token */}
        <EditableText
          label={t('global_configs.max_token')}
          value={'12'}
          onSubmit={() => {}}
          flexProps={{ h: '24px' }}
        />
      </Flex>

      {/* -- config end */}
    </Flex>
  )
}

export default CommonConfig
