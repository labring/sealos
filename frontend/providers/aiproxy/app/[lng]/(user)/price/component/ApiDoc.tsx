import React from 'react'
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Box,
  Text,
  Code,
  Flex
} from '@chakra-ui/react'
import { ModelConfig } from '@/types/models/model'

interface ApiDocContent {
  title: string
  endpoint: string
  method: string
  requestExample: string
  responseExample: string
  additionalInfo?: {
    voices?: string[]
    formats?: string[]
  }
}

interface ApiDocDrawerProps {
  isOpen: boolean
  onClose: () => void
  modelConfig: ModelConfig // 您可以根据实际类型定义更精确的类型
}

const getApiDocContent = (modelConfig: ModelConfig): ApiDocContent => {
  switch (modelConfig.type) {
    case 1:
      return {
        title: '聊天补全',
        endpoint: '/chat/completions',
        method: 'POST',
        requestExample: `curl --request POST \\
--url https://aiproxy.hzh.sealos.run/v1/chat/completions \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
"model": "${modelConfig.model}",
"messages": [
  {
    "role": "user",
    "content": "Sealos 是什么"
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
              "content": "Sealos 是一个基于 Kubernetes 的云操作系统，旨在为用户提供简单、高效、可扩展的云原生应用部署和管理体验。"
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
        title: '文本嵌入',
        endpoint: '/embeddings',
        method: 'POST',
        requestExample: `curl --request POST \\
--url https://aiproxy.hzh.sealos.run/v1/embeddings \\
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
        title: '语音合成',
        endpoint: '/audio/speech',
        method: 'POST',
        requestExample: `curl --request POST \\
--url https://aiproxy.hzh.sealos.run/v1/audio/speech \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
"model": "${modelConfig.model}",
"input": "The text to generate audio for",
"voice": "zhinan",
"response_format": "mp3",
"stream": true,
"speed": 1
}' > audio.mp3`,
        responseExample: 'Binary audio data',
        additionalInfo: {
          voices: [
            'zhinan',
            'zhiqi',
            'zhichu',
            'zhide',
            'zhijia',
            'zhiru',
            'zhiqian',
            'zhixiang',
            'zhiwei',
            'zhihao'
          ],
          formats: ['mp3', 'wav', 'pcm']
        }
      }
    case 8:
      return {
        title: '语音转文本',
        endpoint: '/audio/transcriptions',
        method: 'POST',
        requestExample: `curl --request POST \\
--url https://aiproxy.hzh.sealos.run/v1/audio/transcriptions \\
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
        title: '重排序',
        endpoint: '/rerank',
        method: 'POST',
        requestExample: `curl --request POST \\
--url https://aiproxy.hzh.sealos.run/v1/rerank \\
--header "Authorization: Bearer $token" \\
--header 'Content-Type: application/json' \\
--data '{
"model": "${modelConfig.model}",
"query": "Apple",
"documents": [
  "苹果",
  "香蕉",
  "水果",
  "蔬菜"
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
    default:
      return {
        title: '暂无示例',
        endpoint: '',
        method: '',
        requestExample: '暂无示例',
        responseExample: '暂无示例'
      }
  }
}

const ApiDocDrawer: React.FC<ApiDocDrawerProps> = ({ isOpen, onClose, modelConfig }) => {
  const apiDoc = getApiDocContent(modelConfig)

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{apiDoc.title} API</DrawerHeader>

        <DrawerBody>
          <Flex direction="column" gap={6} overflowY="auto">
            <Box>
              <Text fontWeight="bold" mb={2}>
                {apiDoc.method} {apiDoc.endpoint}
              </Text>
            </Box>

            {/* 请求示例部分 */}
            <Box>
              <Text fontWeight="bold" mb={3} fontSize="md">
                请求示例
              </Text>
              <Box bg="gray.800" p={4} borderRadius="md" overflowX="auto">
                <Code display="block" whiteSpace="pre" color="white" bg="transparent">
                  {apiDoc.requestExample}
                </Code>
              </Box>
            </Box>

            {/* 响应示例部分 */}
            <Box>
              <Text fontWeight="bold" mb={3} fontSize="md">
                响应示例
              </Text>
              <Box bg="gray.800" p={4} borderRadius="md" overflowX="auto">
                <Code display="block" whiteSpace="pre" color="white" bg="transparent">
                  {apiDoc.responseExample}
                </Code>
              </Box>
            </Box>

            {/* 参数说明部分 - 如果有额外信息才显示 */}
            {apiDoc.additionalInfo && (
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="md">
                  参数说明
                </Text>

                {apiDoc.additionalInfo.voices && (
                  <Box mb={4}>
                    <Text fontWeight="bold" mb={2}>
                      可用的voice值:
                    </Text>
                    <Flex flexWrap="wrap" gap={2}>
                      {apiDoc.additionalInfo.voices.map((voice) => (
                        <Box key={voice} bg="gray.100" px={2} py={1} borderRadius="md">
                          {voice}
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                )}

                {apiDoc.additionalInfo.formats && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      可用的response_format值:
                    </Text>
                    <Flex flexWrap="wrap" gap={2}>
                      {apiDoc.additionalInfo.formats.map((format) => (
                        <Box key={format} bg="gray.100" px={2} py={1} borderRadius="md">
                          {format}
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>
            )}
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

export default ApiDocDrawer
