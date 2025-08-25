'use client'
import React from 'react'
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Box,
  Text,
  Code,
  Flex,
  Button,
  Badge
} from '@chakra-ui/react'
import { ModelConfig } from '@/types/models/model'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ModelComponent } from './Model'
import { useBackendStore } from '@/store/backend'
import CodeBlock from './CodeHight'
import { useMessage } from '@sealos/ui'

interface ApiDocContent {
  title: string
  endpoint: string
  method: string
  requestExample: string
  responseExample: string
  responseFormat: string
  requestAdditionalInfo?: {
    voices?: string[]
    formats?: string[]
  }
  responseAdditionalInfo?: {
    voices?: string[]
    formats?: string[]
  }
}

interface ApiDocDrawerProps {
  isOpen: boolean
  onClose: () => void
  modelConfig: ModelConfig
}

const getApiDocContent = (
  modelConfig: ModelConfig,
  apiEndpoint: string,
  t: TranslationFunction
): ApiDocContent => {
  switch (modelConfig.type) {
    case 1:
      return {
        title: t('modeType.1'),
        endpoint: '/chat/completions',
        method: 'POST',
        responseFormat: 'json',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/chat/completions \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
  "model": "${modelConfig.model}",
  "messages": [
    {
      "role": "user",
      "content": "What is Sealos"
    }
  ],
  "stream": false,
  "max_tokens": 512,
  "temperature": 0.7
}'`,
        responseExample: `{
  "object": "chat.completion",
  "created": 1729672480,
  "model": "${modelConfig.model}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Sealos is a cloud operating system based on Kubernetes, designed to provide users with a simple, efficient, and scalable cloud-native application deployment and management experience."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 52,
    "total_tokens": 70
  }
}`
      }
    case 3:
      return {
        title: t('modeType.3'),
        endpoint: '/embeddings',
        method: 'POST',
        responseFormat: 'json',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/embeddings \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
  "model": "${modelConfig.model}",
  "input": "Your text string goes here",
  "encoding_format": "float"
}'`,
        responseExample: `{
  "object": "list",
  "model": "${modelConfig.model}",
  "data": [
    {
      "object": "embedding",
      "embedding": [
        -0.1082494854927063,
        0.022976752370595932
        ...
      ],
      "index": 0
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 0,
    "total_tokens": 4
  }
}`
      }
    case 7:
      return {
        title: t('modeType.7'),
        endpoint: '/audio/speech',
        method: 'POST',
        responseFormat: 'binary',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/audio/speech \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
  "model": "${modelConfig.model}",
  "input": "The text to generate audio for",
${
  modelConfig?.config?.support_voices?.length
    ? `  "voice": "${modelConfig.config.support_voices[0]}",\n`
    : ''
}${
          modelConfig?.config?.support_formats?.length
            ? `  "response_format": "${modelConfig.config.support_formats[0]}",\n`
            : ''
        }  "stream": true,
  "speed": 1
}' > audio.mp3`,
        responseExample: 'Binary audio data',
        requestAdditionalInfo: {
          voices: modelConfig?.config?.support_voices,
          formats: modelConfig?.config?.support_formats
        }
      }
    case 8:
      return {
        title: t('modeType.8'),
        endpoint: '/audio/transcriptions',
        method: 'POST',
        responseFormat: 'json',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/audio/transcriptions \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: multipart/form-data' \\
--form model=${modelConfig.model} \\
--form 'file=@"audio.mp3"'`,
        responseExample: `{
  "text": "<string>"
}`
      }
    case 10:
      return {
        title: t('modeType.10'),
        endpoint: '/rerank',
        method: 'POST',
        responseFormat: 'json',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/rerank \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
  "model": "${modelConfig.model}",
  "query": "Apple",
  "documents": [
    "Apple",
    "Banana",
    "Fruit",
    "Vegetable"
  ],
  "top_n": 4,
  "return_documents": false,
  "max_chunks_per_doc": 1024,
  "overlap_tokens": 80
}'`,
        responseExample: `{
  "results": [
    {
      "index": 0,
      "relevance_score": 0.9953725
    },
    {
      "index": 2,
      "relevance_score": 0.002157342
    },
    {
      "index": 1,
      "relevance_score": 0.00046371284
    },
    {
      "index": 3,
      "relevance_score": 0.000017502925
    }
  ],
  "meta": {
    "tokens": {
      "input_tokens": 28
    }
  }
}`
      }
    case 11:
      return {
        title: t('modeType.11'),
        endpoint: '/parse/pdf',
        method: 'POST',
        responseFormat: 'json',
        requestExample: `curl --request POST \\
--url ${apiEndpoint}/v1/parse/pdf \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: multipart/form-data' \\
--form model=${modelConfig.model} \\
--form 'file=@"test.pdf"'`,
        responseExample: `{
  "pages": 1,
  "markdown": "sf ad fda daf da \\\\( f \\\\) ds f sd fs d afdas fsd asfad f\\n\\n\\n\\n![img](data:image/jpeg;base64,/9...)\\n\\n| sadsa |  |  |\\n| --- | --- | --- |\\n|  | sadasdsa | sad |\\n|  |  | dsadsadsa |\\n|  |  |  |\\n\\n\\n\\na fda"
}`
      }
    default:
      return {
        title: t('modeType.0'),
        endpoint: '',
        method: '',
        responseFormat: 'json',
        requestExample: 'unknown',
        responseExample: 'unknown'
      }
  }
}

const ApiDocDrawer: React.FC<ApiDocDrawerProps> = ({ isOpen, onClose, modelConfig }) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const aiproxyBackend = useBackendStore((state) => state.aiproxyBackend)
  const { docUrl } = useBackendStore()
  const apiDoc = getApiDocContent(modelConfig, aiproxyBackend, t)

  const { message } = useMessage({
    warningBoxBg: '#FFFAEB',
    warningIconBg: '#F79009',
    warningIconFill: 'white',
    successBoxBg: '#EDFBF3',
    successIconBg: '#039855',
    successIconFill: 'white'
  })

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="full">
      <DrawerOverlay bg="rgba(0, 0, 0, 0)" />
      <DrawerContent
        maxWidth="400px"
        width="400px"
        rounded="md"
        position="absolute"
        height="calc(100% - 4px)"
        mt="4px"
        boxShadow="lg"
        border="1px solid"
        borderColor="grayModern.200"
        overflow="hidden">
        <Box
          display="flex"
          height="48px"
          pl="10px"
          justifyContent="space-between"
          alignItems="center"
          alignSelf="stretch"
          borderBottom="1px solid"
          borderColor="grayModern.100">
          <Button
            onClick={onClose}
            variant="unstyled"
            display="inline-flex"
            h="28px"
            padding="4px"
            justifyContent="center"
            alignItems="center"
            borderRadius="4px">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.41083 4.41076C4.73626 4.08533 5.2639 4.08533 5.58934 4.41076L10.0001 8.82151L14.4108 4.41076C14.7363 4.08533 15.2639 4.08533 15.5893 4.41076C15.9148 4.7362 15.9148 5.26384 15.5893 5.58928L11.1786 10L15.5893 14.4108C15.9148 14.7362 15.9148 15.2638 15.5893 15.5893C15.2639 15.9147 14.7363 15.9147 14.4108 15.5893L10.0001 11.1785L5.58934 15.5893C5.2639 15.9147 4.73626 15.9147 4.41083 15.5893C4.08539 15.2638 4.08539 14.7362 4.41083 14.4108L8.82157 10L4.41083 5.58928C4.08539 5.26384 4.08539 4.7362 4.41083 4.41076Z"
                fill="#111824"
              />
            </svg>
          </Button>
        </Box>

        <DrawerBody p="0px">
          <Flex direction="column" gap="12px" overflowY="auto" padding="24px 24px 12px 24px">
            {/* header */}
            <Box display="flex" alignSelf="stretch" position="relative">
              <ModelComponent modelConfig={modelConfig} displayType={true} />
              <Button
                onClick={() => {
                  window.open(docUrl, '_blank')
                }}
                variant="unstyled"
                position="absolute"
                top="0"
                right="0"
                display="inline-flex"
                gap="1px"
                justifyContent="center"
                alignItems="center"
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontStyle="normal"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                _hover={{
                  color: 'brightBlue.600'
                }}>
                <Text>{t('drawer.doc')}</Text>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.76674 3.70016C4.76674 4.02233 5.02791 4.28349 5.35008 4.28349L8.89153 4.28349L3.28768 9.88735C3.05988 10.1152 3.05988 10.4845 3.28768 10.7123C3.51549 10.9401 3.88484 10.9401 4.11264 10.7123L9.71649 5.10845L9.71649 8.64991C9.71649 8.97207 9.97766 9.23324 10.2998 9.23324C10.622 9.23324 10.8832 8.97207 10.8832 8.64991L10.8832 3.70016C10.8832 3.378 10.622 3.11683 10.2998 3.11683L5.35008 3.11683C5.02791 3.11683 4.76674 3.37799 4.76674 3.70016Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </Box>

            {/* method */}
            <Box display="flex" gap="10px" alignItems="center">
              <Badge
                display="flex"
                padding="2px 8px"
                justifyContent="center"
                alignItems="center"
                gap="2px"
                borderRadius="4px"
                background="brightBlue.100">
                <Text
                  color="brightBlue.600"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {apiDoc.method}
                </Text>
              </Badge>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2"
                height="18"
                viewBox="0 0 2 18"
                fill="none">
                <path d="M1 1L1 17" stroke="#F0F1F6" strokeLinecap="round" />
              </svg>

              <Flex gap="4px" alignItems="center" justifyContent="flex-start">
                {apiDoc.endpoint
                  .split('/')
                  .filter(Boolean)
                  .map((segment, index, array) => (
                    <React.Fragment key={index}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="5"
                        height="12"
                        viewBox="0 0 5 12"
                        fill="none">
                        <path
                          d="M4.42017 1.30151L0.999965 10.6984"
                          stroke="#C4CBD7"
                          strokeLinecap="round"
                        />
                      </svg>
                      <Text
                        color="grayModern.600"
                        fontFamily="PingFang SC"
                        fontSize="12px"
                        fontStyle="normal"
                        fontWeight={500}
                        lineHeight="16px"
                        letterSpacing="0.5px">
                        {segment}
                      </Text>
                    </React.Fragment>
                  ))}
              </Flex>
            </Box>

            {/* request example and response example */}
            <Flex direction="column" gap="16px" alignItems="flex-start" alignSelf="stretch">
              {/* request example */}
              <Flex direction="column" gap="8px" alignItems="flex-start" alignSelf="stretch">
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('drawer.requestExample')}
                </Text>

                {/* code */}
                <Flex
                  direction="column"
                  alignItems="flex-start"
                  justifyContent="center"
                  alignSelf="stretch"
                  rounded="md"
                  overflow="hidden">
                  <Box
                    display="flex"
                    alignSelf="stretch"
                    padding="9px 12px"
                    justifyContent="space-between"
                    alignItems="center"
                    background="#232833">
                    <Text
                      color="white"
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontStyle="normal"
                      fontWeight={500}
                      lineHeight="16px"
                      letterSpacing="0.5px">
                      {'bash'}
                    </Text>

                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(apiDoc.requestExample).then(
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
                      }}
                      variant="unstyled"
                      display="inline-flex"
                      padding="4px"
                      minW="unset"
                      height="22px"
                      width="22px"
                      justifyContent="center"
                      alignItems="center"
                      borderRadius="4px"
                      bg="transparent"
                      _hover={{
                        bg: 'rgba(255, 255, 255, 0.1)'
                      }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M2.86483 2.30131C2.73937 2.30131 2.61904 2.35115 2.53032 2.43987C2.44161 2.52859 2.39176 2.64891 2.39176 2.77438V7.5282C2.39176 7.65366 2.44161 7.77399 2.53032 7.86271C2.61904 7.95142 2.73937 8.00127 2.86483 8.00127H3.39304C3.7152 8.00127 3.97637 8.26243 3.97637 8.5846C3.97637 8.90676 3.7152 9.16793 3.39304 9.16793H2.86483C2.42995 9.16793 2.01288 8.99517 1.70537 8.68766C1.39786 8.38015 1.2251 7.96308 1.2251 7.5282V2.77438C1.2251 2.3395 1.39786 1.92242 1.70537 1.61491C2.01288 1.3074 2.42995 1.13464 2.86483 1.13464H7.61865C8.05354 1.13464 8.47061 1.3074 8.77812 1.61491C9.08563 1.92242 9.25839 2.33949 9.25839 2.77438V3.30258C9.25839 3.62475 8.99722 3.88592 8.67505 3.88592C8.35289 3.88592 8.09172 3.62475 8.09172 3.30258V2.77438C8.09172 2.64891 8.04188 2.52859 7.95316 2.43987C7.86444 2.35115 7.74412 2.30131 7.61865 2.30131H2.86483ZM6.56225 5.99872C6.30098 5.99872 6.08918 6.21052 6.08918 6.47179V11.2256C6.08918 11.4869 6.30098 11.6987 6.56225 11.6987H11.3161C11.5773 11.6987 11.7891 11.4869 11.7891 11.2256V6.47179C11.7891 6.21052 11.5773 5.99872 11.3161 5.99872H6.56225ZM4.92251 6.47179C4.92251 5.56619 5.65664 4.83206 6.56225 4.83206H11.3161C12.2217 4.83206 12.9558 5.56619 12.9558 6.47179V11.2256C12.9558 12.1312 12.2217 12.8653 11.3161 12.8653H6.56225C5.65664 12.8653 4.92251 12.1312 4.92251 11.2256V6.47179Z"
                          fill="white"
                          fillOpacity="0.8"
                        />
                      </svg>
                    </Button>
                  </Box>
                  <Box padding="12px" background="#14181E" alignSelf="stretch">
                    <CodeBlock code={apiDoc.requestExample} language="bash" />
                  </Box>
                </Flex>

                {/* additional info */}

                {apiDoc?.requestAdditionalInfo?.voices &&
                  apiDoc?.requestAdditionalInfo?.voices?.length > 0 && (
                    <Box
                      display="flex"
                      flexDirection="column"
                      padding="10px 12px"
                      alignSelf="stretch"
                      gap="8px"
                      alignItems="flex-start"
                      rounded="md"
                      border="1px solid"
                      borderColor="grayModern.200">
                      <Flex gap="8px">
                        <Text
                          color="brightBlue.600"
                          fontFamily="PingFang SC"
                          fontSize="12px"
                          fontStyle="normal"
                          fontWeight={500}
                          lineHeight="16px"
                          letterSpacing="0.5px">
                          {'voice'}
                        </Text>
                        <Flex gap="4px">
                          <Badge
                            display="flex"
                            padding="2px 8px"
                            justifyContent="center"
                            alignItems="center"
                            gap="2px"
                            borderRadius="4px"
                            background="grayModern.100">
                            <Text
                              color="grayModern.500"
                              fontFamily="PingFang SC"
                              fontSize="12px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="16px"
                              letterSpacing="0.5px"
                              textTransform="none">
                              {'enum<string>'}
                            </Text>
                          </Badge>
                          <Badge
                            display="flex"
                            padding="2px 8px"
                            justifyContent="center"
                            alignItems="center"
                            borderRadius="4px"
                            gap="2px"
                            background="adora.50">
                            <Text
                              color="adora.600"
                              fontFamily="PingFang SC"
                              fontSize="12px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="16px"
                              textTransform="none"
                              letterSpacing="0.5px">
                              {t('drawer.voice')}
                            </Text>
                          </Badge>
                        </Flex>
                      </Flex>

                      <Box
                        display="flex"
                        flexDirection="column"
                        gap="4px"
                        alignItems="flex-start"
                        alignSelf="stretch">
                        <Text
                          color="grayModern.500"
                          fontFamily="PingFang SC"
                          fontSize="12px"
                          fontStyle="normal"
                          fontWeight={500}
                          lineHeight="16px"
                          letterSpacing="0.5px">
                          {t('drawer.voiceValues')}
                        </Text>

                        <Flex flexWrap="wrap" gap="8px">
                          {apiDoc?.requestAdditionalInfo?.voices?.map((voice) => (
                            <Badge
                              key={voice}
                              display="flex"
                              padding="2px 8px"
                              justifyContent="center"
                              alignItems="center"
                              gap="2px"
                              borderRadius="4px"
                              background="grayModern.100">
                              <Text
                                color="grayModern.900"
                                fontFamily="PingFang SC"
                                fontSize="12px"
                                fontStyle="normal"
                                fontWeight={500}
                                lineHeight="16px"
                                letterSpacing="0.5px"
                                textTransform="none">
                                {voice}
                              </Text>
                            </Badge>
                          ))}
                        </Flex>
                      </Box>
                    </Box>
                  )}

                {apiDoc?.requestAdditionalInfo?.formats &&
                  apiDoc?.requestAdditionalInfo?.formats?.length > 0 && (
                    <Box
                      display="flex"
                      flexDirection="column"
                      padding="10px 12px"
                      alignSelf="stretch"
                      gap="8px"
                      alignItems="flex-start"
                      rounded="md"
                      border="1px solid"
                      borderColor="grayModern.200">
                      <Flex gap="8px">
                        <Text
                          color="brightBlue.600"
                          fontFamily="PingFang SC"
                          fontSize="12px"
                          fontStyle="normal"
                          fontWeight={500}
                          lineHeight="16px"
                          letterSpacing="0.5px">
                          {'response_format'}
                        </Text>
                        <Flex gap="4px">
                          <Badge
                            display="flex"
                            padding="2px 8px"
                            justifyContent="center"
                            alignItems="center"
                            gap="2px"
                            borderRadius="4px"
                            background="grayModern.100">
                            <Text
                              color="grayModern.500"
                              fontFamily="PingFang SC"
                              fontSize="12px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="16px"
                              letterSpacing="0.5px"
                              textTransform="none">
                              {'enum<string>'}
                            </Text>
                          </Badge>
                          <Badge
                            display="flex"
                            padding="2px 8px"
                            justifyContent="center"
                            alignItems="center"
                            borderRadius="4px"
                            gap="2px"
                            background="grayModern.100">
                            <Text
                              color="grayModern.500"
                              fontFamily="PingFang SC"
                              fontSize="12px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="16px"
                              letterSpacing="0.5px"
                              textTransform="none">
                              {'default:mp3'}
                            </Text>
                          </Badge>
                        </Flex>
                      </Flex>

                      <Box
                        display="flex"
                        flexDirection="column"
                        gap="4px"
                        alignItems="flex-start"
                        alignSelf="stretch">
                        <Text
                          color="grayModern.500"
                          fontFamily="PingFang SC"
                          fontSize="12px"
                          fontStyle="normal"
                          fontWeight={500}
                          lineHeight="16px"
                          letterSpacing="0.5px">
                          {t('drawer.responseFormatValues')}
                        </Text>

                        <Flex flexWrap="wrap" gap="8px">
                          {apiDoc?.requestAdditionalInfo?.formats?.map((format) => (
                            <Badge
                              key={format}
                              display="flex"
                              padding="2px 8px"
                              justifyContent="center"
                              alignItems="center"
                              gap="2px"
                              borderRadius="4px"
                              background="grayModern.100">
                              <Text
                                color="grayModern.900"
                                fontFamily="PingFang SC"
                                fontSize="12px"
                                fontStyle="normal"
                                fontWeight={500}
                                lineHeight="16px"
                                letterSpacing="0.5px"
                                textTransform="none">
                                {format}
                              </Text>
                            </Badge>
                          ))}
                        </Flex>
                      </Box>
                    </Box>
                  )}
              </Flex>

              {/* response example */}
              <Flex direction="column" gap="8px" alignItems="flex-start" alignSelf="stretch">
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('drawer.responseExample')}
                </Text>

                {/* code */}
                <Flex
                  direction="column"
                  alignItems="flex-start"
                  justifyContent="center"
                  alignSelf="stretch"
                  rounded="md"
                  overflow="hidden">
                  <Box
                    display="flex"
                    alignSelf="stretch"
                    padding="9px 12px"
                    justifyContent="space-between"
                    alignItems="center"
                    background="#232833">
                    <Text
                      color="white"
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontStyle="normal"
                      fontWeight={500}
                      lineHeight="16px"
                      letterSpacing="0.5px">
                      {apiDoc.responseFormat}
                    </Text>

                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(apiDoc.responseExample).then(
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
                      }}
                      variant="unstyled"
                      display="inline-flex"
                      padding="4px"
                      minW="unset"
                      height="22px"
                      width="22px"
                      justifyContent="center"
                      alignItems="center"
                      borderRadius="4px"
                      bg="transparent"
                      _hover={{
                        bg: 'rgba(255, 255, 255, 0.1)'
                      }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M2.86483 2.30131C2.73937 2.30131 2.61904 2.35115 2.53032 2.43987C2.44161 2.52859 2.39176 2.64891 2.39176 2.77438V7.5282C2.39176 7.65366 2.44161 7.77399 2.53032 7.86271C2.61904 7.95142 2.73937 8.00127 2.86483 8.00127H3.39304C3.7152 8.00127 3.97637 8.26243 3.97637 8.5846C3.97637 8.90676 3.7152 9.16793 3.39304 9.16793H2.86483C2.42995 9.16793 2.01288 8.99517 1.70537 8.68766C1.39786 8.38015 1.2251 7.96308 1.2251 7.5282V2.77438C1.2251 2.3395 1.39786 1.92242 1.70537 1.61491C2.01288 1.3074 2.42995 1.13464 2.86483 1.13464H7.61865C8.05354 1.13464 8.47061 1.3074 8.77812 1.61491C9.08563 1.92242 9.25839 2.33949 9.25839 2.77438V3.30258C9.25839 3.62475 8.99722 3.88592 8.67505 3.88592C8.35289 3.88592 8.09172 3.62475 8.09172 3.30258V2.77438C8.09172 2.64891 8.04188 2.52859 7.95316 2.43987C7.86444 2.35115 7.74412 2.30131 7.61865 2.30131H2.86483ZM6.56225 5.99872C6.30098 5.99872 6.08918 6.21052 6.08918 6.47179V11.2256C6.08918 11.4869 6.30098 11.6987 6.56225 11.6987H11.3161C11.5773 11.6987 11.7891 11.4869 11.7891 11.2256V6.47179C11.7891 6.21052 11.5773 5.99872 11.3161 5.99872H6.56225ZM4.92251 6.47179C4.92251 5.56619 5.65664 4.83206 6.56225 4.83206H11.3161C12.2217 4.83206 12.9558 5.56619 12.9558 6.47179V11.2256C12.9558 12.1312 12.2217 12.8653 11.3161 12.8653H6.56225C5.65664 12.8653 4.92251 12.1312 4.92251 11.2256V6.47179Z"
                          fill="white"
                          fillOpacity="0.8"
                        />
                      </svg>
                    </Button>
                  </Box>
                  <Box padding="12px" background="#14181E" alignSelf="stretch">
                    <CodeBlock code={apiDoc.responseExample} language="json" />
                  </Box>
                </Flex>
              </Flex>
              {/* response example */}
            </Flex>
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

export default ApiDocDrawer
