'use client'
import { Badge, Box, Flex, Text } from '@chakra-ui/react'
import { ListIcon } from '@/ui/icons/home/Icons'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import OpenAIIcon from '@/ui/svg/icons/modelist/openai.svg'
import Image, { StaticImageData } from 'next/image'

const IconList: Record<string, StaticImageData> = {
  OpenAI: OpenAIIcon
}

const modes = {
  OpenAI: {
    render: () => {
      return (
        <Flex align="center" gap="12px">
          <Image src={IconList.OpenAI} alt="OpenAI" width={20} height={20} />
          <Text
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            OpenAI
          </Text>
        </Flex>
      )
    }
  }
}

const ModelList: React.FC = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
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
              23
            </Text>
          </Badge>
        </Flex>
      </Flex>

      {/* 第二个 Flex 容器用于标题和描述 */}
      <Flex flexDir="column" align="flex-start" gap="16px">
        <Flex align="center" gap="12px">
          <Image src={IconList.OpenAI} alt="OpenAI" width={20} height={20} />
          <Text
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            OpenAI
          </Text>
        </Flex>
      </Flex>
    </>
  )
}

export default ModelList
