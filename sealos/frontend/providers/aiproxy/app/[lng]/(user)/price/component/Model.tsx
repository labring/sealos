'use client'
import { Flex, Text, Badge } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { MyTooltip } from '@/components/common/MyTooltip'
import { useMessage } from '@sealos/ui'
import { ModelConfig } from '@/types/models/model'
import Image, { StaticImageData } from 'next/image'
import { getTranslationWithFallback } from '@/utils/common'
import { modelIcons } from '@/ui/icons/mode-icons'

export const getModelIcon = (modelOwner: string): StaticImageData => {
  const icon = modelIcons[modelOwner as keyof typeof modelIcons] || modelIcons['default']
  return icon
}

// 在组件外部定义样式配置
const MODEL_TYPE_STYLES = {
  1: {
    background: '#F0FBFF',
    color: '#0884DD'
  },
  2: {
    background: '#F4F4F7',
    color: '#383F50'
  },
  3: {
    background: '#EBFAF8',
    color: '#007E7C'
  },
  4: {
    background: '#FEF3F2',
    color: '#F04438'
  },
  5: {
    background: '#F0EEFF',
    color: '#6F5DD7'
  },
  6: {
    background: '#FFFAEB',
    color: '#DC6803'
  },
  7: {
    background: '#FAF1FF',
    color: '#9E53C1'
  },
  8: {
    background: '#FFF1F6',
    color: '#E82F72'
  },
  9: {
    background: '#F0F4FF',
    color: '#3370FF'
  },
  10: {
    background: '#EDFAFF',
    color: '#0077A9'
  },
  default: {
    background: '#F4F4F7',
    color: '#383F50'
  }
} as const

// 在组件中使用
export const getTypeStyle = (type: number) => {
  return MODEL_TYPE_STYLES[type as keyof typeof MODEL_TYPE_STYLES] || MODEL_TYPE_STYLES.default
}

export const ModelComponent = ({
  modelConfig,
  displayType = false
}: {
  modelConfig: ModelConfig
  displayType?: boolean
}) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage({
    warningBoxBg: '#FFFAEB',
    warningIconBg: '#F79009',
    warningIconFill: 'white',
    successBoxBg: '#EDFBF3',
    successIconBg: '#039855',
    successIconFill: 'white'
  })

  const iconSrc = getModelIcon(modelConfig.owner)

  return (
    <Flex alignItems="center" justifyContent="flex-start" gap="8px" h="42px">
      <MyTooltip
        label={getTranslationWithFallback(
          `modeOwner.${String(modelConfig.owner)}`,
          'modeOwner.unknown',
          t as any
        )}
        width="auto"
        height="auto">
        <Image src={iconSrc} alt={modelConfig.model} width={32} height={32} />
      </MyTooltip>
      <Flex gap="4px" alignItems="flex-start" direction="column">
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
          whiteSpace="nowrap"
          onClick={() =>
            navigator.clipboard.writeText(modelConfig.model).then(
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
          cursor="pointer">
          {modelConfig.model}
        </Text>
        <Flex gap="4px" alignItems="center" justifyContent="flex-start">
          {displayType && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background={getTypeStyle(modelConfig.type).background}>
              <Text
                color={getTypeStyle(modelConfig.type).color}
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {getTranslationWithFallback(
                  `modeType.${String(modelConfig.type)}`,
                  'modeType.0',
                  t as any
                )}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.vision && (
            <MyTooltip
              label={
                <Text
                  color="grayModern.900"
                  fontFamily="Inter"
                  fontSize="12px"
                  fontWeight={400}
                  lineHeight="150%">
                  {t('price.modelVisionLabel')}
                </Text>
              }
              width="auto"
              height="auto">
              <Badge
                display="flex"
                padding="1px 4px"
                justifyContent="center"
                alignItems="center"
                gap="2px"
                borderRadius="4px"
                background="var(--Teal-50, #EBFAF8)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none">
                  <path
                    d="M6.9999 5.35705C7.43565 5.35705 7.85355 5.53015 8.16167 5.83827C8.46979 6.14639 8.64289 6.56429 8.64289 7.00004C8.64289 7.43578 8.46979 7.85368 8.16167 8.1618C7.85355 8.46992 7.43565 8.64302 6.9999 8.64302C6.56416 8.64302 6.14626 8.46992 5.83814 8.1618C5.53002 7.85368 5.35692 7.43578 5.35692 7.00004C5.35692 6.56429 5.53002 6.14639 5.83814 5.83827C6.14626 5.53015 6.56416 5.35705 6.9999 5.35705ZM6.9999 2.89258C9.44394 2.89258 11.5695 4.2494 12.6718 6.25045C12.7785 6.44422 12.8319 6.5411 12.8719 6.73711C12.8982 6.86627 12.8982 7.13381 12.8719 7.26297C12.8319 7.45898 12.7785 7.55586 12.6718 7.74962C11.5695 9.75068 9.44394 11.1075 6.9999 11.1075C4.55587 11.1075 2.43032 9.75068 1.32805 7.74962C1.22132 7.55586 1.16795 7.45898 1.12793 7.26297C1.10156 7.13381 1.10156 6.86627 1.12793 6.73711C1.16795 6.5411 1.22132 6.44422 1.32805 6.25045C2.43032 4.2494 4.55587 2.89258 6.9999 2.89258ZM2.70809 6.12392C2.56204 6.31728 2.48901 6.41395 2.4229 6.6637C2.38194 6.81844 2.38194 7.18164 2.4229 7.33638C2.48901 7.58612 2.56204 7.6828 2.70809 7.87616C3.10318 8.3992 3.59235 8.84798 4.15342 9.19794C5.00732 9.73055 5.99352 10.0129 6.9999 10.0129C8.00629 10.0129 8.99249 9.73055 9.84639 9.19794C10.4075 8.84798 10.8966 8.3992 11.2917 7.87616C11.4378 7.6828 11.5108 7.58612 11.5769 7.33638C11.6179 7.18164 11.6179 6.81844 11.5769 6.6637C11.5108 6.41395 11.4378 6.31728 11.2917 6.12392C10.8966 5.60087 10.4075 5.15209 9.84639 4.80213C8.99249 4.26953 8.00629 3.98718 6.9999 3.98718C5.99352 3.98718 5.00732 4.26953 4.15342 4.80213C3.59235 5.15209 3.10318 5.60088 2.70809 6.12392Z"
                    fill="#00A9A6"
                  />
                </svg>
                <Text
                  color="#007E7C" // Changed from "#EBFAF8" to "teal.700" for better readability
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="11px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('price.modelVision')}
                </Text>
              </Badge>
            </MyTooltip>
          )}
          {modelConfig.config?.tool_choice && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              gap="2px"
              borderRadius="4px"
              background="#F0EEFF">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2.38275 8.52685C1.2703 7.4144 0.919623 5.8231 1.32317 4.38399C1.43455 3.98679 1.60339 3.60118 1.82953 3.24043L3.94506 5.35597L5.19686 5.19681L5.35601 3.94501L3.2406 1.8296C3.60141 1.60351 3.98708 1.43474 4.38434 1.32342C5.82323 0.920248 7.41413 1.27101 8.52636 2.38324C9.65082 3.5077 9.99697 5.1214 9.57262 6.57264L12.1265 8.95704C13.0537 9.82265 13.0787 11.2844 12.1818 12.1813C11.2845 13.0786 9.82197 13.053 8.95657 12.1249L6.57622 9.57192C5.12392 9.99811 3.50826 9.65236 2.38275 8.52685ZM5.39327 2.33236L6.58552 3.52461L6.24026 6.24021L3.52465 6.58547L2.33192 5.39274C2.2883 6.23601 2.5846 7.07879 3.20771 7.70189C4.01259 8.50677 5.1785 8.76623 6.2477 8.45246L6.93854 8.24972L9.80987 11.3293C10.225 11.7745 10.9265 11.7867 11.3569 11.3563C11.7871 10.9261 11.7751 10.225 11.3303 9.80981L8.25115 6.93498L8.45284 6.24521C8.76525 5.1768 8.50554 4.01234 7.70141 3.2082C7.07855 2.58534 6.23621 2.28903 5.39327 2.33236Z"
                  fill="#6F5DD7"
                />
                <path
                  d="M10.9396 10.1019C11.1708 10.3332 11.1708 10.7081 10.9396 10.9394C10.7083 11.1707 10.3333 11.1707 10.102 10.9394C9.87072 10.7081 9.87072 10.3332 10.102 10.1019C10.3333 9.8706 10.7083 9.8706 10.9396 10.1019Z"
                  fill="#6F5DD7"
                />
              </svg>
              <Text
                color="#6F5DD7"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('price.modelToolChoice')}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.max_context_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#F7F8FA">
              <Text
                color="#667085"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {`${
                  modelConfig.config.max_context_tokens % 1024 === 0
                    ? Math.ceil(modelConfig.config.max_context_tokens / 1024)
                    : Math.ceil(modelConfig.config.max_context_tokens / 1000)
                }K`}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.max_output_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#EDFAFF">
              <Text
                color="#0077A9"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {`${Math.ceil(modelConfig.config.max_output_tokens / 1024)}K ${t(
                  'price.response'
                )}`}
              </Text>
            </Badge>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
