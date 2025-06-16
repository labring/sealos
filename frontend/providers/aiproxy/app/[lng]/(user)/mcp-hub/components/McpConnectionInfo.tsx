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
import { useRouter } from 'next/navigation'

export interface McpConnectionInfoProps {
  mcpDetail: McpDetail
  setViewMode?: () => void
}

// 自定义配置渲染组件
const ConfigRenderer = ({ config, lng }: { config: any; lng: string }) => {
  const router = useRouter()

  const handleTokenClick = () => {
    router.push(`/${lng}/key`)
  }

  const renderConfigContent = () => {
    const configString = JSON.stringify(config, null, 2)
    const parts = configString.split('your_token')

    if (parts.length === 1) {
      return <span>{configString}</span>
    }

    return (
      <>
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <Text
                as="span"
                color="blue.300"
                cursor="pointer"
                textDecoration="underline"
                _hover={{ color: 'blue.200' }}
                onClick={handleTokenClick}>
                your_token
              </Text>
            )}
          </span>
        ))}
      </>
    )
  }

  return (
    <Code
      as="pre"
      colorScheme="gray"
      bg="transparent"
      color="white"
      fontSize="12px"
      fontFamily="Monaco, monospace"
      whiteSpace="pre-wrap"
      w="full">
      {renderConfigContent()}
    </Code>
  )
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
              <ConfigRenderer config={config} lng={lng} />
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
              <ConfigRenderer config={config} lng={lng} />
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
                  <ConfigRenderer config={generateConfig('sse')} lng={lng} />
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
                  <ConfigRenderer config={generateConfig('streamable_http')} lng={lng} />

                  <Flex justifyContent="flex-end" gap="8px">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generateConfig('streamable_http'))}>
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
