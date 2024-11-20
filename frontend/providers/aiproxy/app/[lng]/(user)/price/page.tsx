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
  Spinner
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery } from '@tanstack/react-query'
import { ModelPrice } from '@/types/backend'
import { getModelPrices } from '@/api/platform'
import { useMemo } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table'
import { CurrencySymbol } from '@sealos/ui'
import { ModelIdentifier } from '@/types/front'
import { MyTooltip } from '@/components/MyTooltip'
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
import Image, { StaticImageData } from 'next/image'
import { useBackendStore } from '@/store/backend'

function Price() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  return (
    <Box
      w="full"
      h="full"
      display="inline-flex"
      padding="0px 12px 12px 0px"
      alignItems="center"
      bg="white">
      <Box w="full" h="full" padding="27px 32px 0px 32px">
        <Flex w="full" h="full" gap="32px" direction="column">
          <Text
            color="black"
            fontFamily="PingFang SC"
            fontSize="20px"
            fontWeight={500}
            lineHeight="26px"
            letterSpacing="0.15px">
            {t('price.title')}
          </Text>
          <Box flex="1" minHeight="0">
            <PriceTable />
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}

function PriceTable() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isLoading, data } = useQuery({
    queryKey: ['getModelPrices'],
    queryFn: () => getModelPrices(),
    refetchOnReconnect: true
  })
  const { currencySymbol } = useBackendStore()

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

  const getIdentifier = (modelName: string): ModelIdentifier => {
    return modelName.toLowerCase().split(/[-._\d]/)[0] as ModelIdentifier
  }

  const getModelIcon = (modelName: string): StaticImageData => {
    const identifier = getIdentifier(modelName)
    const group = Object.values(modelGroups).find((group) => group.identifiers.includes(identifier))
    return group?.icon || OpenAIIcon
  }

  const ModelComponent = ({ modelName }: { modelName: string }) => {
    const { message } = useMessage({
      warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
      warningIconBg: 'var(--Yellow-500, #F79009)',
      warningIconFill: 'white',
      successBoxBg: 'var(--Green-50, #EDFBF3)',
      successIconBg: 'var(--Green-600, #039855)',
      successIconFill: 'white'
    })
    const iconSrc = getModelIcon(modelName)

    return (
      <Flex align="center" gap="12px">
        <Image src={iconSrc} alt={modelName} width={20} height={20} />
        <MyTooltip label={t(getIdentifier(modelName))} width="auto" height="auto">
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
            cursor="pointer">
            {modelName}
          </Text>
        </MyTooltip>
      </Flex>
    )
  }

  const sortModelsByIdentifier = (models: ModelPrice[]): ModelPrice[] => {
    const groupedModels = new Map<string, ModelPrice[]>()

    // Group models by identifier
    models.forEach((model) => {
      const identifier = getIdentifier(model.name)
      if (!groupedModels.has(identifier)) {
        groupedModels.set(identifier, [])
      }
      groupedModels.get(identifier)!.push(model)
    })

    // Define order based on modelGroups
    const orderMap = new Map(Object.keys(modelGroups).map((key, index) => [key, index]))

    // Sort based on modelGroups order, unknown models go to the end
    const sortedEntries = Array.from(groupedModels.entries()).sort((a, b) => {
      const orderA = orderMap.has(a[0]) ? orderMap.get(a[0])! : Number.MAX_VALUE
      const orderB = orderMap.has(b[0]) ? orderMap.get(b[0])! : Number.MAX_VALUE
      return orderA - orderB
    })

    return sortedEntries.flatMap(([_, models]) => models)
  }

  const columnHelper = createColumnHelper<ModelPrice>()
  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: 'name',
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
      cell: (info) => <ModelComponent modelName={info.getValue()} />
    }),
    columnHelper.accessor((row) => row.prompt, {
      id: 'inputPrice',
      header: () => {
        return (
          <Box position={'relative'}>
            <Flex alignItems={'center'}>
              <Text
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                mr={'4px'}
                letterSpacing="0.5px">
                {t('key.inputPrice')}
              </Text>
              <CurrencySymbol type={currencySymbol} fontSize={'12px'} h={'15px'} />
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
          </Box>
        )
      },
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
    columnHelper.accessor((row) => row.completion, {
      id: 'outputPrice',
      header: () => (
        <Box position={'relative'}>
          <Flex alignItems={'center'}>
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              mr={'4px'}
              letterSpacing="0.5px">
              {t('key.outputPrice')}
            </Text>
            <CurrencySymbol type={currencySymbol} fontSize={'12px'} h={'15px'} />
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
        </Box>
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
    })
  ]

  const sortedData = useMemo(() => sortModelsByIdentifier(data || []), [data])

  const table = useReactTable({
    data: sortedData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return isLoading ? (
    <Center>
      <Spinner size="md" color="grayModern.800" />
    </Center>
  ) : (
    <TableContainer w="full" h="full" maxH="full" overflowY="auto">
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
          {table.getRowModel().rows.map((row) => (
            <Tr
              key={row.id}
              height="48px"
              alignSelf="stretch"
              borderBottom="1px solid"
              borderColor="grayModern.150">
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

export default Price
