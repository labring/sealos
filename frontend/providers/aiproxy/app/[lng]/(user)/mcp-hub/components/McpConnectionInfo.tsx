'use client'
import {
  Box,
  Flex,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Code,
  Button
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { McpDetail } from '@/types/mcp'
import { useMessage } from '@sealos/ui'

export interface McpConnectionInfoProps {
  mcpDetail: McpDetail
  setViewMode?: () => void
}

export default function McpConnectionInfo({ mcpDetail, setViewMode }: McpConnectionInfoProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage()

  const hasSSE = mcpDetail.endpoints?.sse
  const hasHTTP = mcpDetail.endpoints?.streamable_http

  const generateConfig = (type: 'sse' | 'streamable_http') => {
    const endpoint = type === 'sse' ? mcpDetail.endpoints.sse : mcpDetail.endpoints.streamable_http
    const url = `https://${mcpDetail.endpoints.host}${endpoint}?key=your_token`

    return {
      mcpServers: {
        [`aiproxy-${mcpDetail.id}`]: {
          type: type === 'sse' ? 'sse' : 'streamable_http',
          url: url
        }
      }
    }
  }

  const copyToClipboard = (config: object) => {
    const configString = JSON.stringify(config, null, 2)
    navigator.clipboard
      .writeText(configString)
      .then(() => {
        message({
          status: 'success',
          title: t('copySuccess'),
          duration: 2000
        })
      })
      .catch(() => {
        message({
          status: 'error',
          title: t('copyFailed'),
          duration: 2000
        })
      })
  }

  // 如果只有一种连接方式，就不显示Tab
  if (hasSSE && !hasHTTP) {
    const config = generateConfig('sse')
    return (
      <Box h="full" overflow="hidden">
        <Flex direction="column" gap="16px" h="full">
          <Alert status="info" borderRadius="8px">
            <AlertIcon />
            <Text fontSize="12px">{t('mcpHub.sseUrlTip')}</Text>
          </Alert>

          <Box flex="1" overflow="hidden">
            <Box flex="1" overflow="auto" bg="grayModern.900" borderRadius="8px" p="16px">
              <Code
                as="pre"
                colorScheme="gray"
                bg="transparent"
                color="white"
                fontSize="12px"
                fontFamily="Monaco, monospace"
                whiteSpace="pre-wrap"
                w="full">
                {JSON.stringify(config, null, 2)}
              </Code>
              <Flex justifyContent="flex-end" gap="8px">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(config)}>
                  {t('copy')}
                </Button>
                {setViewMode && (
                  <Button size="sm" variant="outline" onClick={setViewMode}>
                    {t('mcpHub.config')}
                  </Button>
                )}
              </Flex>
            </Box>
          </Box>
        </Flex>
      </Box>
    )
  }

  if (!hasSSE && hasHTTP) {
    const config = generateConfig('streamable_http')
    return (
      <Box h="full" overflow="hidden">
        <Flex direction="column" gap="16px" h="full">
          <Alert status="info" borderRadius="8px">
            <AlertIcon />
            <Text fontSize="12px">{t('mcpHub.httpStreamTip')}</Text>
          </Alert>

          <Box flex="1" overflow="hidden">
            <Box flex="1" overflow="auto" bg="grayModern.900" borderRadius="8px" p="16px">
              <Code
                as="pre"
                colorScheme="gray"
                bg="transparent"
                color="white"
                fontSize="12px"
                fontFamily="Monaco, monospace"
                whiteSpace="pre-wrap"
                w="full">
                {JSON.stringify(config, null, 2)}
              </Code>
              <Flex justifyContent="flex-end" gap="8px">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(config)}>
                  {t('copy')}
                </Button>
                {setViewMode && (
                  <Button size="sm" variant="outline" onClick={setViewMode}>
                    {t('mcpHub.config')}
                  </Button>
                )}
              </Flex>
            </Box>
          </Box>
        </Flex>
      </Box>
    )
  }

  // 有两种连接方式，显示Tab
  return (
    <Box h="full" overflow="hidden">
      <Tabs h="full" display="flex" flexDirection="column">
        <TabList>
          <Tab fontSize="14px">{t('mcpHub.tabSSE')}</Tab>
          <Tab fontSize="14px">{t('mcpHub.tabHTTP')}</Tab>
        </TabList>

        <TabPanels flex="1" overflow="hidden">
          <TabPanel h="full" p="16px 0">
            <Flex direction="column" gap="16px" h="full">
              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="12px">{t('mcpHub.sseUrlTip')}</Text>
              </Alert>

              <Box flex="1" overflow="hidden">
                <Box flex="1" overflow="auto" bg="grayModern.900" borderRadius="8px" p="16px">
                  <Code
                    as="pre"
                    colorScheme="gray"
                    bg="transparent"
                    color="white"
                    fontSize="12px"
                    fontFamily="Monaco, monospace"
                    whiteSpace="pre-wrap"
                    w="full">
                    {JSON.stringify(generateConfig('sse'), null, 2)}
                  </Code>
                  <Flex justifyContent="flex-end" gap="8px">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generateConfig('sse'))}>
                      {t('copy')}
                    </Button>
                    {setViewMode && (
                      <Button size="sm" variant="outline" onClick={setViewMode}>
                        {t('mcpHub.config')}
                      </Button>
                    )}
                  </Flex>
                </Box>
              </Box>
            </Flex>
          </TabPanel>

          <TabPanel h="full" p="16px 0">
            <Flex direction="column" gap="16px" h="full">
              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="12px">{t('mcpHub.httpStreamTip')}</Text>
              </Alert>

              <Box flex="1" overflow="hidden">
                <Box flex="1" overflow="auto" bg="grayModern.900" borderRadius="8px" p="16px">
                  <Code
                    as="pre"
                    colorScheme="gray"
                    bg="transparent"
                    color="white"
                    fontSize="12px"
                    fontFamily="Monaco, monospace"
                    whiteSpace="pre-wrap"
                    w="full">
                    {JSON.stringify(generateConfig('streamable_http'), null, 2)}
                  </Code>

                  <Flex justifyContent="flex-end" gap="8px">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generateConfig('sse'))}>
                      {t('copy')}
                    </Button>
                    {setViewMode && (
                      <Button size="sm" variant="outline" onClick={setViewMode}>
                        {t('mcpHub.config')}
                      </Button>
                    )}
                  </Flex>
                </Box>
              </Box>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
