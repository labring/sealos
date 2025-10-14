'use client'

import ReactJson, { OnCopyProps } from 'react-json-view'
import {
  Box,
  Center,
  Flex,
  Grid,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { CurrencySymbol } from '@sealos/ui'
import { useMessage } from '@sealos/ui'
import { useQuery } from '@tanstack/react-query'

import { getUserLogDetail } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import { MyTooltip } from '@/components/common/MyTooltip'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useBackendStore } from '@/store/backend'
import { QueryKey } from '@/types/query-key'
import { LogItem } from '@/types/user/logs'
import { getTranslationWithFallback } from '@/utils/common'

import { getTimeDiff } from '../tools/handleTime'

export default function LogDetailModal({
  isOpen,
  onClose,
  rowData,
}: {
  isOpen: boolean
  onClose: () => void
  rowData: LogItem | null
}): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  const { data: logDetail, isLoading } = useQuery({
    queryKey: [QueryKey.GetUserLogDetail, rowData?.request_detail?.log_id],
    queryFn: () => {
      if (!rowData?.request_detail?.log_id) throw new Error('No log ID')
      return getUserLogDetail(rowData.request_detail.log_id)
    },
    enabled: !!rowData?.request_detail?.log_id,
  })

  const isDetailLoading = !!rowData?.request_detail?.log_id && isLoading

  const { message } = useMessage({
    warningBoxBg: '#FFFAEB',
    warningIconBg: '#F79009',
    warningIconFill: 'white',
    successBoxBg: '#EDFBF3',
    successIconBg: '#039855',
    successIconFill: 'white',
  })

  // 定义默认的网格配置
  const gridConfig = {
    labelWidth: '153px',
    rowHeight: '48px',
    jsonContentHeight: '122px',
  }

  const renderDetailRow = (
    leftLabel: string | React.ReactNode | null,
    leftValue: string | number | React.ReactNode | undefined,
    rightLabel?: string | React.ReactNode | null,
    rightValue?: string | number | React.ReactNode | undefined,
    options?: {
      labelWidth?: string
      rowHeight?: string
      isFirst?: boolean
      isLast?: boolean
    }
  ) => {
    // 辅助函数：渲染标签
    const renderLabel = (label: string | React.ReactNode | null) => {
      if (label === null) return null
      if (typeof label === 'string') {
        return (
          <Text
            color="grayModern.800"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px"
          >
            {label}
          </Text>
        )
      }
      return label
    }

    // 辅助函数：渲染值
    const renderValue = (value: string | number | React.ReactNode | undefined) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px"
          >
            {value}
          </Text>
        )
      }
      return value
    }

    // 判断是否显示左侧或右侧列
    const showLeftSection = leftLabel !== null && leftLabel !== undefined
    const showRightSection = rightLabel !== null && rightLabel !== undefined

    // 根据显示的列数设置模板
    const gridTemplateColumns = showLeftSection && showRightSection ? '1fr 1fr' : '1fr'

    return (
      <Grid
        templateColumns={gridTemplateColumns}
        gap="0 0"
        borderLeft="1px solid #E8EBF0"
        borderRight="1px solid #E8EBF0"
        borderTop="1px solid #E8EBF0"
        borderBottom={options?.isLast ? '1px solid #E8EBF0' : 'none'}
        borderRadius={
          options?.isFirst && options?.isLast
            ? '8px'
            : options?.isFirst
            ? '8px 8px 0 0'
            : options?.isLast
            ? '0 0 8px 8px'
            : '0'
        }
        overflow="hidden"
      >
        {showLeftSection && (
          <Grid templateColumns={`${options?.labelWidth || '153px'} 1fr`} gap="0 0">
            <Box
              bg="grayModern.25"
              px="18px"
              py="15px"
              borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center"
            >
              {renderLabel(leftLabel)}
            </Box>
            <Box
              bg="white"
              p="12px"
              maxW="100%"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center"
              overflowX="auto"
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {renderValue(leftValue)}
            </Box>
          </Grid>
        )}

        {showRightSection && (
          <Grid templateColumns={`${options?.labelWidth || '153px'} 1fr`}>
            <Box
              bg="grayModern.25"
              px="18px"
              py="15px"
              borderRight="1px solid #E8EBF0"
              borderLeft="1px solid #E8EBF0"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center"
            >
              {renderLabel(rightLabel)}
            </Box>
            <Box
              bg="white"
              p="12px"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center"
            >
              {renderValue(rightValue)}
            </Box>
          </Grid>
        )}
      </Grid>
    )
  }

  const renderJsonContent = (
    label: string,
    content: string | undefined,
    options?: {
      labelWidth?: string
      contentHeight?: string
      isFirst?: boolean
      isLast?: boolean
    }
  ) => {
    if (!content) return null
    const handleCopy = (copy: OnCopyProps) => {
      if (typeof window === 'undefined') return

      const copyText =
        typeof copy.src === 'object' ? JSON.stringify(copy.src, null, 2) : String(copy.src)

      navigator.clipboard.writeText(copyText)
    }

    let parsed = null

    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = content
    }
    return (
      <Grid
        templateColumns={`${options?.labelWidth || '153px'} 1fr`}
        borderRadius={
          options?.isFirst && options?.isLast
            ? '8px'
            : options?.isFirst
            ? '8px 8px 0 0'
            : options?.isLast
            ? '0 0 8px 8px'
            : '0'
        }
        borderLeft="1px solid #E8EBF0"
        borderRight="1px solid #E8EBF0"
        borderTop="1px solid #E8EBF0"
        borderBottom={options?.isLast ? '1px solid #E8EBF0' : 'none'}
        overflow="hidden"
      >
        <Box
          bg="grayModern.25"
          px="18px"
          py="15px"
          borderRight="1px solid #E8EBF0"
          display="flex"
          alignItems="center"
          h="100%"
          borderTopLeftRadius={options?.isFirst ? '8px' : '0'}
          borderBottomLeftRadius={options?.isLast ? '8px' : '0'}
        >
          <Text
            color="grayModern.800"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px"
          >
            {label}
          </Text>
        </Box>
        <Box
          bg="white"
          p="12px"
          maxH={options?.contentHeight || '122px'}
          minH={options?.contentHeight || '122px'}
          overflowY="auto"
          borderTopRightRadius={options?.isFirst ? '8px' : '0'}
          borderBottomRightRadius={options?.isLast ? '8px' : '0'}
          sx={{
            '&::-webkit-scrollbar': {
              width: '4px',
              height: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'grayModern.100',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'grayModern.200',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'grayModern.300',
            },
          }}
        >
          {typeof parsed === 'object' ? (
            <ReactJson
              src={parsed}
              theme="rjv-default"
              name={false}
              displayDataTypes={false}
              enableClipboard={handleCopy}
              collapsed={2}
              style={{
                fontSize: '14px',
                fontFamily: 'Monaco, monospace',
                backgroundColor: 'transparent',
                width: '100%',
                height: '100%',
              }}
              iconStyle="circle"
            />
          ) : (
            <Text color="grayModern.600" fontSize="14px" fontWeight={500} lineHeight="20px">
              {parsed}
            </Text>
          )}
        </Box>
      </Grid>
    )
  }

  return isDetailLoading ? (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent w="730px" maxW="730px" maxH="806px" flexShrink="0">
        <ModalHeader
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          flexShrink="0"
          borderBottom="1px solid grayModern.100"
          background="grayModern.25"
          w="full"
        >
          <Flex alignItems="flex-start" flexShrink="0">
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="16px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="24px"
              letterSpacing="0.15px"
            >
              {t('logs.logDetail')}
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton
          display="flex"
          width="28px"
          height="28px"
          padding="4px"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          borderRadius="4px"
        />
        <ModalBody>
          <Center w="full" minH="400px">
            <Spinner size="xl" />
          </Center>
        </ModalBody>
      </ModalContent>
    </Modal>
  ) : (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent w="730px" maxW="730px" maxH="806px" flexShrink="0">
        <ModalHeader
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          flexShrink="0"
          borderBottom="1px solid grayModern.100"
          background="grayModern.25"
          w="full"
        >
          <Flex alignItems="flex-start" flexShrink="0">
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="16px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="24px"
              letterSpacing="0.15px"
            >
              {t('logs.logDetail')}
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton
          display="flex"
          width="28px"
          height="28px"
          padding="4px"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          borderRadius="4px"
        />
        <ModalBody
          py="18px"
          px="20px"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          <Flex direction="column" gap="0">
            {renderDetailRow(
              t('logs.requestId'),
              rowData?.request_id,
              t('logs.status'),
              <Text
                color={rowData?.code === 200 ? '#039855' : '#D92D20'}
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight={500}
                lineHeight="20px"
                letterSpacing="0.5px"
              >
                {rowData?.code === 200
                  ? t('logs.success')
                  : `${t('logs.failed')} (${rowData?.code})`}
              </Text>,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: true,
              }
            )}
            {renderDetailRow(
              rowData?.endpoint ? 'Endpoint' : undefined,
              rowData?.endpoint ? rowData?.endpoint : undefined,
              t('logs.mode'),
              getTranslationWithFallback(
                `modeType.${String(rowData?.mode)}`,
                'modeType.0',
                t as any
              ),
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false,
              }
            )}

            {renderDetailRow(
              t('logs.requestTime'),
              new Date(rowData?.request_at || 0).toLocaleString(),
              t('logs.totalTime'),
              getTimeDiff(rowData?.created_at || 0, rowData?.request_at || 0),
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false,
              }
            )}
            {renderDetailRow(
              t('logs.tokenName'),
              rowData?.token_name,
              t('logs.tokenId'),
              rowData?.token_id,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false,
              }
            )}
            {renderDetailRow(t('logs.model'), rowData?.model, undefined, undefined, {
              labelWidth: gridConfig.labelWidth,
              rowHeight: gridConfig.rowHeight,
              isFirst: false,
            })}

            {rowData?.content &&
              renderDetailRow(
                t('logs.info'),
                <Flex
                  w="100%"
                  overflowX="auto"
                  sx={{
                    '&::-webkit-scrollbar': {
                      display: 'none',
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                  }}
                >
                  <Text
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.1px"
                    whiteSpace="nowrap"
                    cursor="pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(rowData.content || '').then(
                        () => {
                          message({
                            status: 'success',
                            title: t('copySuccess'),
                            isClosable: true,
                            duration: 2000,
                            position: 'top',
                          })
                        },
                        (err) => {
                          message({
                            status: 'warning',
                            title: t('copyFailed'),
                            description: err?.message || t('copyFailed'),
                            isClosable: true,
                            position: 'top',
                          })
                        }
                      )
                    }}
                  >
                    {rowData.content}
                  </Text>
                </Flex>,
                undefined,
                undefined,
                {
                  labelWidth: gridConfig.labelWidth,
                  rowHeight: gridConfig.rowHeight,
                  isFirst: false,
                }
              )}

            {logDetail?.request_body &&
              renderJsonContent(t('logs.requestBody'), logDetail.request_body, {
                labelWidth: gridConfig.labelWidth,
                contentHeight: gridConfig.jsonContentHeight,
                isFirst: false,
              })}
            {logDetail?.response_body &&
              renderJsonContent(t('logs.responseBody'), logDetail.response_body, {
                labelWidth: gridConfig.labelWidth,
                contentHeight: gridConfig.jsonContentHeight,
                isLast: false,
              })}

            {rowData?.price?.per_request_price
              ? renderDetailRow(
                  <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                    <Text
                      color="grayModern.800"
                      fontFamily="PingFang SC"
                      fontSize="14px"
                      fontWeight={500}
                      lineHeight="20px"
                      mr={'4px'}
                      letterSpacing="0.5px"
                      whiteSpace="nowrap"
                    >
                      {t('price.fixedPrice')}
                    </Text>
                    <CurrencySymbol type={currencySymbol} />
                  </Flex>,
                  rowData?.price?.per_request_price || 0,
                  undefined,
                  undefined,
                  {
                    labelWidth: gridConfig.labelWidth,
                    rowHeight: gridConfig.rowHeight,
                    isFirst: false,
                  }
                )
              : renderDetailRow(
                  <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                    <Text
                      color="grayModern.800"
                      fontFamily="PingFang SC"
                      fontSize="14px"
                      fontWeight={500}
                      lineHeight="20px"
                      mr={'4px'}
                      letterSpacing="0.5px"
                      whiteSpace="nowrap"
                    >
                      {t('key.inputPrice')}
                    </Text>
                    <CurrencySymbol type={currencySymbol} />
                    <Text
                      color="grayModern.500"
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontWeight={500}
                      lineHeight="16px"
                      letterSpacing="0.5px"
                      textTransform="lowercase"
                      whiteSpace="nowrap"
                    >
                      /{t('price.per1kTokens').toLowerCase()}
                    </Text>
                  </Flex>,
                  rowData?.price?.input_price || 0,
                  <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                    <Text
                      color="grayModern.800"
                      fontFamily="PingFang SC"
                      fontSize="14px"
                      fontWeight={500}
                      lineHeight="20px"
                      mr="4px"
                      letterSpacing="0.5px"
                      whiteSpace="nowrap"
                    >
                      {t('key.outputPrice')}
                    </Text>
                    <CurrencySymbol type={currencySymbol} />
                    <Text
                      color="grayModern.500"
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontWeight={500}
                      lineHeight="16px"
                      letterSpacing="0.5px"
                      textTransform="lowercase"
                      whiteSpace="nowrap"
                    >
                      /{t('price.per1kTokens').toLowerCase()}
                    </Text>
                  </Flex>,
                  rowData?.price?.output_price || 0,
                  {
                    labelWidth: gridConfig.labelWidth,
                    rowHeight: gridConfig.rowHeight,
                    isFirst: false,
                  }
                )}

            {rowData?.price?.image_input_price &&
              renderDetailRow(
                <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                  <Text
                    color="grayModern.800"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    mr={'4px'}
                    letterSpacing="0.5px"
                    whiteSpace="nowrap"
                  >
                    {t('price.imageInputPrice')}
                  </Text>
                  <CurrencySymbol type={currencySymbol} />
                  <Text
                    color="grayModern.500"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    textTransform="lowercase"
                    whiteSpace="nowrap"
                  >
                    /{t('price.per1kTokens').toLowerCase()}
                  </Text>
                </Flex>,
                rowData?.price?.image_input_price || 0,
                undefined,
                undefined,
                {
                  labelWidth: gridConfig.labelWidth,
                  rowHeight: gridConfig.rowHeight,
                  isFirst: false,
                }
              )}

            {rowData?.price?.thinking_mode_output_price &&
              renderDetailRow(
                <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                  <Text
                    color="grayModern.800"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    mr={'4px'}
                    letterSpacing="0.5px"
                    whiteSpace="nowrap"
                  >
                    {t('price.thinkingModeOutputPrice')}
                  </Text>
                  <CurrencySymbol type={currencySymbol} />
                  <Text
                    color="grayModern.500"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    textTransform="lowercase"
                    whiteSpace="nowrap"
                  >
                    /{t('price.per1kTokens').toLowerCase()}
                  </Text>
                </Flex>,
                rowData?.price?.thinking_mode_output_price || 0,
                undefined,
                undefined,
                {
                  labelWidth: gridConfig.labelWidth,
                  rowHeight: gridConfig.rowHeight,
                  isFirst: false,
                }
              )}

            {renderDetailRow(
              t('logs.inputTokens'),
              rowData?.usage?.input_tokens || 0,
              t('logs.outputTokens'),
              rowData?.usage?.output_tokens || 0,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false,
              }
            )}

            {renderDetailRow(
              <MyTooltip placement="bottom-end" label={t('logs.total_price_tip')}>
                <Flex alignItems={'center'} gap={'4px'}>
                  <Text
                    noOfLines={1}
                    color="grayModern.800"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.5px"
                  >
                    {t('logs.total_price')}
                  </Text>
                  <CurrencySymbol type={currencySymbol} />
                </Flex>
              </MyTooltip>,
              rowData?.used_amount || 0,
              undefined,
              undefined,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isLast: true,
              }
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
