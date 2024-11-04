'use client'
import { Badge, Center, Flex, Spinner, Text } from '@chakra-ui/react'
import { ListIcon } from '@/ui/icons/home/Icons'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import Image, { StaticImageData } from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { getModels } from '@/api/platform'
import OpenAIIcon from '@/ui/svg/icons/modelist/openai.svg'
import QwenIcon from '@/ui/svg/icons/modelist/qianwen.svg'
import ChatglmIcon from '@/ui/svg/icons/modelist/chatglm.svg'
import DeepseekIcon from '@/ui/svg/icons/modelist/deepseek.svg'
import MoonshotIcon from '@/ui/svg/icons/modelist/moonshot.svg'
import SparkdeskIcon from '@/ui/svg/icons/modelist/sparkdesk.svg'
// import DoubaoIcon from '@/ui/svg/icons/modelist/doubao.svg'

// 图标导入

// 图标映射
const IconList: Record<string, StaticImageData> = {
  OpenAI: OpenAIIcon,
  qwen: QwenIcon,
  chatglm: ChatglmIcon,
  deepseek: DeepseekIcon,
  moonshot: MoonshotIcon,
  sparkdesk: SparkdeskIcon,
  doubao: OpenAIIcon,
  glm: OpenAIIcon,
  abab: OpenAIIcon,
  ernie: OpenAIIcon,
  cogview: OpenAIIcon
}

// 获取模型主标识符
const getModelIcon = (modelName: string): StaticImageData => {
  const mainIdentifier = modelName.toLowerCase().split(/[-._]/)[0]
  if (mainIdentifier === 'gpt') return IconList.OpenAI
  return IconList[mainIdentifier] || IconList.OpenAI
}

// 创建模型渲染器
const createModelRender = (modelName: string) => {
  const ModelComponent = () => {
    const iconSrc = getModelIcon(modelName)

    return (
      <Flex align="center" gap="12px">
        <Image src={iconSrc} alt={modelName} width={20} height={20} />
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
  }
  ModelComponent.displayName = `Model_${modelName}`
  return ModelComponent
}

// 生成动态的模型类型
const modelList = [
  'qwen-long',
  'chatglm_lite',
  'deepseek-chat',
  'moonshot-v1-128k',
  'SparkDesk-v4.0',
  'qwen-plus',
  'Doubao-embedding',
  'SparkDesk',
  'Doubao-pro-32k',
  'SparkDesk-v3.1-128K',
  'Doubao-lite-128k',
  'glm-4',
  'moonshot-v1-8k',
  'abab5.5-chat',
  'abab5.5s-chat',
  'Doubao-lite-32k',
  'chatglm_std',
  'moonshot-v1-32k',
  'ERNIE-4.0-8K',
  'glm-3-turbo',
  'embedding-2',
  'deepseek-coder',
  'abab6.5-chat',
  'SparkDesk-v3.5',
  'chatglm_turbo',
  'abab6.5s-chat',
  'abab6-chat',
  'SparkDesk-v2.1',
  'qwen-max',
  'Doubao-pro-128k',
  'Doubao-pro-4k',
  'Doubao-lite-4k',
  'qwen-turbo',
  'chatglm_pro',
  'glm-4v',
  'cogview-3',
  'ERNIE-3.5-8K',
  'SparkDesk-v3.1',
  'SparkDesk-v1.1',
  // 添加原有的 GPT 模型
  'gpt-4o-mini',
  'gpt-4',
  'gpt-3.5-turbo'
] as const

type ModelKey = (typeof modelList)[number]

// 创建模型渲染映射
const modes: Record<string, { render: () => JSX.Element }> = modelList.reduce(
  (acc, modelName) => ({
    ...acc,
    [modelName]: { render: createModelRender(modelName) }
  }),
  {}
)

// 模型列表组件
const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isLoading, data } = useQuery(['getModels'], () => getModels())

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
            const ModelComponent = modes[model]?.render
            return ModelComponent ? <ModelComponent key={model} /> : null
          })
        )}
      </Flex>
    </>
  )
}

export default ModelList
