'use client'
import {
  Box,
  Flex,
  Text,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Center,
  Spinner,
  Button,
  Badge,
  useDisclosure
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table'
import { CurrencySymbol } from '@sealos/ui'
import { MyTooltip } from '@/components/common/MyTooltip'
import { ModelConfig } from '@/types/models/model'
import { getTranslationWithFallback } from '@/utils/common'
import { useBackendStore } from '@/store/backend'
import ApiDocDrawer from './ApiDoc'
import { ModelComponent } from './Model'
import { getTypeStyle } from './Model'

type SortDirection = 'asc' | 'desc' | false

export function PriceTable({
  modelConfigs,
  isLoading
}: {
  modelConfigs: ModelConfig[]
  isLoading: boolean
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleOpenApiDoc = (modelConfig: ModelConfig) => {
    setSelectedModel(modelConfig)
    onOpen()
  }

  const { currencySymbol } = useBackendStore()

  const columnHelper = createColumnHelper<ModelConfig>()
  const columns = [
    columnHelper.accessor((row) => row.model, {
      id: 'model',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('key.name')}
        </Text>
      ),
      cell: (info) => <ModelComponent modelConfig={info.row.original} />
    }),
    columnHelper.accessor((row) => row.type, {
      id: 'type',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('key.modelType')}
        </Text>
      ),
      cell: (info) => (
        <Badge
          display="inline-flex"
          padding="6px 12px"
          justifyContent="center"
          alignItems="center"
          borderRadius="4px"
          background={getTypeStyle(info.getValue()).background}>
          <Text
            color={getTypeStyle(info.getValue()).color}
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {getTranslationWithFallback(
              `modeType.${String(info.getValue())}`,
              'modeType.0',
              t as any
            )}
          </Text>
        </Badge>
      )
    }),
    columnHelper.accessor((row) => row.rpm, {
      id: 'rpm',
      header: () => (
        <Flex alignItems="center" gap="4px" w="fit-content">
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('price.modelRpm')}
          </Text>
          <MyTooltip
            placement="bottom-end"
            width="auto"
            height="auto"
            label={
              <Text
                whiteSpace="nowrap"
                color="grayModern.900"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={400}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('price.modelRpmTooltip')}
              </Text>
            }>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="14"
              viewBox="0 0 15 14"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.79299 2.23698C5.16257 2.23698 3.03019 4.36936 3.03019 6.99978C3.03019 9.6302 5.16257 11.7626 7.79299 11.7626C10.4234 11.7626 12.5558 9.6302 12.5558 6.99978C12.5558 4.36936 10.4234 2.23698 7.79299 2.23698ZM1.86353 6.99978C1.86353 3.72503 4.51824 1.07031 7.79299 1.07031C11.0677 1.07031 13.7225 3.72503 13.7225 6.99978C13.7225 10.2745 11.0677 12.9292 7.79299 12.9292C4.51824 12.9292 1.86353 10.2745 1.86353 6.99978ZM7.92275 4.92235C7.68522 4.8816 7.44093 4.92624 7.23315 5.04835C7.02538 5.17046 6.86752 5.36217 6.78755 5.58952C6.68064 5.89343 6.3476 6.05313 6.04369 5.94622C5.73978 5.83931 5.58008 5.50628 5.68699 5.20236C5.85839 4.71511 6.19671 4.30424 6.64202 4.04253C7.08733 3.78082 7.6109 3.68515 8.11998 3.77247C8.62907 3.85979 9.09083 4.12447 9.42347 4.51962C9.75604 4.91469 9.93809 5.41468 9.9374 5.93109C9.93713 6.77507 9.31182 7.32806 8.87572 7.6188C8.63987 7.77603 8.40817 7.89146 8.23774 7.96721C8.15169 8.00545 8.07917 8.0345 8.0268 8.05445C8.00057 8.06445 7.97925 8.07221 7.96366 8.07775L7.94462 8.08442L7.93848 8.08652L7.93629 8.08726L7.93541 8.08755C7.93524 8.08761 7.93469 8.08779 7.75022 7.53439L7.93469 8.08779C7.62906 8.18967 7.2987 8.02449 7.19683 7.71886C7.09498 7.41333 7.26001 7.08309 7.56545 6.9811L7.57281 6.9785C7.58072 6.97569 7.59385 6.97093 7.61148 6.96422C7.64681 6.95075 7.6996 6.92968 7.76391 6.9011C7.89419 6.84319 8.06346 6.75815 8.22857 6.64807C8.5943 6.40425 8.77073 6.1555 8.77073 5.93055L8.77073 5.92968C8.77109 5.68868 8.68615 5.45533 8.53094 5.27096C8.37573 5.08658 8.16028 4.96309 7.92275 4.92235ZM7.20966 9.67285C7.20966 9.35068 7.47083 9.08951 7.79299 9.08951H7.79834C8.12051 9.08951 8.38167 9.35068 8.38167 9.67285C8.38167 9.99501 8.12051 10.2562 7.79834 10.2562H7.79299C7.47083 10.2562 7.20966 9.99501 7.20966 9.67285Z"
                fill="#667085"
              />
            </svg>
          </MyTooltip>
        </Flex>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor(
      (row) => row.price.input_price ?? row.price.output_price ?? row.price.per_request_price ?? 0,
      {
        id: 'input_price',
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            mr={'4px'}
            letterSpacing="0.5px">
            {t('pricing')}
          </Text>
        ),
        cell: (info) => {
          if (info.row.original.price.per_request_price) {
            return (
              <Flex alignItems="center">
                <Text
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                  mr="4px">
                  {t('price.fixedPrice')}: {info.row.original.price.per_request_price}
                </Text>
                <CurrencySymbol
                  type={currencySymbol}
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                />
                <Text
                  color="grayModern.500"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                  textTransform="lowercase">
                  /{t('price.per1kTokens').toLowerCase()}
                </Text>
              </Flex>
            )
          }
          return (
            <Flex direction="column" gap="8px">
              {info.row.original.price.input_price && (
                <Flex alignItems="center">
                  <Text
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    mr="4px">
                    {t('key.inputPrice')}: {info.row.original.price.input_price}
                  </Text>
                  <CurrencySymbol
                    type={currencySymbol}
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                  />
                  <Text
                    color="grayModern.500"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    textTransform="lowercase">
                    /{t('price.per1kTokens').toLowerCase()}
                  </Text>
                </Flex>
              )}
              {info.row.original.price.output_price && (
                <Flex alignItems="center">
                  <Text
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    mr="4px">
                    {t('key.outputPrice')}: {info.row.original.price.output_price}
                  </Text>
                  <CurrencySymbol
                    type={currencySymbol}
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                  />
                  <Text
                    color="grayModern.500"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    textTransform="lowercase">
                    /{t('price.per1kTokens').toLowerCase()}
                  </Text>
                </Flex>
              )}
            </Flex>
          )
        }
      }
    ),
    columnHelper.display({
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('logs.actions')}
        </Text>
      ),
      cell: ({ row }) => {
        const modelConfig = row.original
        return (
          <Button
            onClick={() => handleOpenApiDoc(modelConfig)}
            h="28px"
            variant="unstyled"
            display="inline-flex"
            padding="6px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="4px"
            background="grayModern.150"
            whiteSpace="nowrap"
            transition="all 0.2s ease"
            _hover={{
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease'
            }}
            _active={{
              transform: 'scale(0.92)',
              animation: 'pulse 0.3s ease'
            }}
            sx={{
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.92)' },
                '50%': { transform: 'scale(0.96)' },
                '100%': { transform: 'scale(0.92)' }
              }
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.899414 3.04352C0.899414 2.76738 1.13738 2.54352 1.43092 2.54352H10.5696C10.8631 2.54352 11.1011 2.76738 11.1011 3.04352C11.1011 3.31966 10.8631 3.54352 10.5696 3.54352H1.43092C1.13738 3.54352 0.899414 3.31966 0.899414 3.04352ZM0.899414 5.96889C0.899414 5.69274 1.13738 5.46889 1.43092 5.46889H10.5696C10.8631 5.46889 11.1011 5.69274 11.1011 5.96889C11.1011 6.24503 10.8631 6.46889 10.5696 6.46889H1.43092C1.13738 6.46889 0.899414 6.24503 0.899414 5.96889ZM0.899414 8.9565C0.899414 8.68035 1.13738 8.4565 1.43092 8.4565H7.28546C7.579 8.4565 7.81696 8.68035 7.81696 8.9565C7.81696 9.23264 7.579 9.4565 7.28546 9.4565H1.43092C1.13738 9.4565 0.899414 9.23264 0.899414 8.9565Z"
                fill="#485264"
              />
            </svg>
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontStyle="normal"
              fontSize="11px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {t('logs.detail')}
            </Text>
          </Button>
        )
      },
      id: 'detail'
    })
  ]

  const tableData = useMemo(() => {
    return modelConfigs
  }, [modelConfigs])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <>
      <TableContainer w="full" h="full" flex="1 0 0" minHeight="0" overflowY="auto">
        <Table variant="simple" w="full" size="md">
          <Thead position="sticky" top={0} zIndex={1} bg="white">
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id} height="42px" alignSelf="stretch" bg="grayModern.100">
                {headerGroup.headers.map((header, i) => (
                  <Th
                    key={header.id}
                    border={'none'}
                    borderTopLeftRadius={i === 0 ? '6px' : '0'}
                    borderBottomLeftRadius={i === 0 ? '6px' : '0'}
                    borderTopRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}
                    borderBottomRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td
                  colSpan={columns.length}
                  textAlign="center"
                  border="none"
                  height="100%"
                  width="100%">
                  <Center h="200px">
                    <Spinner size="md" color="grayModern.800" />
                  </Center>
                </Td>
              </Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Tr
                  key={row.id}
                  height="48px"
                  alignSelf="stretch"
                  borderBottom="1px solid"
                  borderColor="grayModern.150">
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
      {selectedModel && (
        <ApiDocDrawer isOpen={isOpen} onClose={onClose} modelConfig={selectedModel} />
      )}
    </>
  )
}
