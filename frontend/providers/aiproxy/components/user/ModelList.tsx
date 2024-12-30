'use client'
import { Badge, Center, Flex, Spinner, Text } from '@chakra-ui/react'
import { ListIcon } from '@/ui/icons/index'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import Image, { StaticImageData } from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { getEnabledMode } from '@/api/platform'
import { useMessage } from '@sealos/ui'
import { MyTooltip } from '@/components/common/MyTooltip'
import { QueryKey } from '@/types/query-key'
import { modelIcons } from '@/ui/icons/mode-icons'
import { getTranslationWithFallback } from '@/utils/common'

const ModelComponent = ({ modelName, modelOwner }: { modelName: string; modelOwner: string }) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  // get model icon
  const getModelIcon = (modelOwner: string): StaticImageData => {
    const icon = modelIcons[modelOwner as keyof typeof modelIcons] || modelIcons['default']
    return icon
  }

  const iconSrc = getModelIcon(modelOwner)

  return (
    <Flex align="center" gap="12px">
      <Image src={iconSrc} alt={modelName} width={20} height={20} />
      <MyTooltip
        label={getTranslationWithFallback(
          `modeOwner.${String(modelOwner)}`,
          'modeOwner.unknown',
          t as any
        )}
        width="auto"
        height="auto">
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px"
          whiteSpace="nowrap"
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

const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isLoading, data } = useQuery([QueryKey.GetEnabledModels], () => getEnabledMode())

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

      {isLoading ? (
        <Center
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          w="100%"
          h="100%"
          zIndex={1}>
          <Spinner size="md" color="grayModern.800" />
        </Center>
      ) : (
        <Flex
          flexDir="column"
          align="flex-start"
          gap="16px"
          h="full"
          maxH="full"
          overflow="hidden"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}>
          {data?.map((modelConfig) => (
            <ModelComponent
              key={modelConfig.model}
              modelName={modelConfig.model}
              modelOwner={modelConfig.owner}
            />
          ))}
        </Flex>
      )}
    </>
  )
}

export default ModelList
