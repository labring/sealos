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
import AbabIcon from '@/ui/svg/icons/modelist/minimax.svg'
import DoubaoIcon from '@/ui/svg/icons/modelist/doubao.svg'
import ErnieIcon from '@/ui/svg/icons/modelist/ernie.svg'
import GlmIcon from '@/ui/svg/icons/modelist/glm.svg'
// 图标映射和标识符关系
const modelGroups = {
  ernie: {
    icon: ErnieIcon,
    identifiers: ['ernie']
  },
  qwen: {
    icon: QwenIcon,
    identifiers: ['qwen']
  },
  chatglm: {
    icon: ChatglmIcon,
    identifiers: ['chatglm', 'glm']
  },
  deepseek: {
    icon: DeepseekIcon,
    identifiers: ['deepseek']
  },
  moonshot: {
    icon: MoonshotIcon,
    identifiers: ['moonshot']
  },
  sparkdesk: {
    icon: SparkdeskIcon,
    identifiers: ['sparkdesk']
  },
  abab: {
    icon: AbabIcon,
    identifiers: ['abab']
  },
  doubao: {
    icon: DoubaoIcon,
    identifiers: ['doubao']
  }
}

// 获取模型图标
const getModelIcon = (modelName: string): StaticImageData => {
  const identifier = modelName.toLowerCase().split(/[-._\d]/)[0]
  const group = Object.values(modelGroups).find((group) => group.identifiers.includes(identifier))
  return group?.icon || OpenAIIcon
}

// 按图标分组模型
const sortModelsByIcon = (models: string[]): string[] => {
  const groupedModels = new Map<StaticImageData, string[]>()

  // 按图标分组
  models.forEach((model) => {
    const icon = getModelIcon(model)
    if (!groupedModels.has(icon)) {
      groupedModels.set(icon, [])
    }
    groupedModels.get(icon)?.push(model)
  })

  // 将分组后的模型展平为数组
  return Array.from(groupedModels.values()).flat()
}

// 模型组件
const ModelComponent = ({ modelName }: { modelName: string }) => {
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

// 模型列表组件
const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isLoading, data } = useQuery(['getModels'], () => getModels())

  // 对模型进行排序
  const sortedModels = data ? sortModelsByIcon(data) : []

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
          sortedModels.map((model) => <ModelComponent key={model} modelName={model} />)
        )}
      </Flex>
    </>
  )
}

export default ModelList
