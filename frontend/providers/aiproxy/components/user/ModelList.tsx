'use client'
import { Badge, Center, Flex, Spinner, Text } from '@chakra-ui/react'
import { ListIcon } from '@/ui/icons/home/Icons'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import OpenAIIcon from '@/ui/svg/icons/modelist/openai.svg'
import Image, { StaticImageData } from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { getModels } from '@/api/platform'

const IconList: Record<string, StaticImageData> = {
  OpenAI: OpenAIIcon
}

type ModelKey = 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo'

const createModelRender = (modelName: string) => {
  const ModelComponent = () => (
    <Flex align="center" gap="12px">
      <Image src={IconList.OpenAI} alt="OpenAI" width={20} height={20} />
      <Text
        color="grayModern.900"
        fontFamily="PingFang SC"
        fontSize="12px"
        fontWeight={500}
        lineHeight="16px"
        letterSpacing="0.5px">
        {modelName}
      </Text>
    </Flex>
  )
  ModelComponent.displayName = `Model_${modelName}`
  return ModelComponent
}

const modes: Record<ModelKey, { render: () => JSX.Element }> = {
  'gpt-4o-mini': { render: createModelRender('gpt-4o-mini') },
  'gpt-4': { render: createModelRender('gpt-4') },
  'gpt-3.5-turbo': { render: createModelRender('gpt-3.5-turbo') }
}

const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const { isLoading, data } = useQuery(['getModels'], () => getModels())
  console.log(data)

  return (
    <>
      <Flex align="center" gap="8px">
        <ListIcon boxSize={18} color="grayModern.900" />
        <Flex align="center" gap="4px">
          <Text
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px">
            {t('modelList.title')}
          </Text>
          <Badge
            display="flex"
            padding="2px 6px"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap="10px"
            borderRadius="20px"
            bg="grayModern.100">
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {data?.length || 0}
            </Text>
          </Badge>
        </Flex>
      </Flex>

      <Flex flexDir="column" align="flex-start" gap="16px">
        {isLoading ? (
          <Center>
            <Spinner size="md" color="grayModern.800" />
          </Center>
        ) : (
          data?.map((model) => {
            const ModelComponent = Object.keys(modes).includes(model)
              ? modes[model as ModelKey].render
              : undefined
            return ModelComponent ? <ModelComponent /> : null
          })
        )}
      </Flex>
    </>
  )
}

export default ModelList
