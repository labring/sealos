'use client'
import { Badge, Center, Flex, Spinner, Text } from '@chakra-ui/react'
import { ListIcon } from '@/ui/icons/home/Icons'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import Image, { StaticImageData } from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { getModels } from '@/api/platform'
import { useMessage } from '@sealos/ui'
// icons
import OpenAIIcon from '@/ui/svg/icons/modelist/openai.svg'
import QwenIcon from '@/ui/svg/icons/modelist/qianwen.svg'
import ChatglmIcon from '@/ui/svg/icons/modelist/chatglm.svg'
import DeepseekIcon from '@/ui/svg/icons/modelist/deepseek.svg'
import MoonshotIcon from '@/ui/svg/icons/modelist/moonshot.svg'
import SparkdeskIcon from '@/ui/svg/icons/modelist/sparkdesk.svg'
import AbabIcon from '@/ui/svg/icons/modelist/minimax.svg'
import DoubaoIcon from '@/ui/svg/icons/modelist/doubao.svg'
import ErnieIcon from '@/ui/svg/icons/modelist/ernie.svg'
import { useMemo } from 'react'
import { MyTooltip } from '@/components/MyTooltip'
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

const getIdentifier = (modelName: string): string => {
  return modelName.toLowerCase().split(/[-._\d]/)[0]
}

// 获取模型图标
const getModelIcon = (modelName: string): StaticImageData => {
  const identifier = getIdentifier(modelName)
  const group = Object.values(modelGroups).find((group) => group.identifiers.includes(identifier))
  return group?.icon || OpenAIIcon
}

const sortModels = (models: string[]): string[] => {
  // 使用 Map 进行分组
  const groupMap = new Map<string, string[]>()

  // 分组
  models.forEach((model) => {
    const identifier = getIdentifier(model)
    if (!groupMap.has(identifier)) {
      groupMap.set(identifier, [])
    }
    groupMap.get(identifier)?.push(model)
  })

  // 按照 identifier 排序并扁平化结果
  return Array.from(groupMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // 按 identifier 排序
    .flatMap(([_, models]) => models.sort()) // 扁平化并保持每组内的排序
}

// 模型组件
const ModelComponent = ({ modelName }: { modelName: string }) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const iconSrc = getModelIcon(modelName)
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  return (
    <Flex align="center" gap="12px">
      <Image src={iconSrc} alt={modelName} width={20} height={20} />
      <MyTooltip label={t('copy')}>
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px"
          onClick={() =>
            navigator.clipboard.writeText(modelName).then(
              () => {
                message({
                  status: 'success',
                  title: t('copySuccess'),
                  isClosable: true,
                  duration: 2000,
                  position: 'top'
                })
              },
              (err) => {
                message({
                  status: 'warning',
                  title: t('copyFailed'),
                  description: err?.message || t('copyFailed'),
                  isClosable: true,
                  position: 'top'
                })
              }
            )
          }
          cursor="pointer"
          _hover={{ color: 'blue.500' }}
          transition="color 0.2s ease">
          {modelName}
        </Text>
      </MyTooltip>
    </Flex>
  )
}

// 模型列表组件
const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isLoading, data } = useQuery(['getModels'], () => getModels())

  const sortedData = useMemo(() => sortModels(data || []), [data])

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
          sortedData.map((model) => <ModelComponent key={model} modelName={model} />)
        )}
      </Flex>
    </>
  )
}

export default ModelList
