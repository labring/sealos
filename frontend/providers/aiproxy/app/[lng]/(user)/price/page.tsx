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
import { useMemo, useState } from 'react'
import {
  Column,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table'
import { TFunction } from 'i18next'
import { SealosCoin } from '@sealos/ui'
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

  const getModelIcon = (modelName: string): StaticImageData => {
    const identifier = getIdentifier(modelName)
    const group = Object.values(modelGroups).find((group) => group.identifiers.includes(identifier))
    return group?.icon || OpenAIIcon
  }

  const ModelComponent = ({ modelName }: { modelName: string }) => {
    const iconSrc = getModelIcon(modelName)

    return (
      <Flex align="center" gap="12px">
        <Image src={iconSrc} alt={modelName} width={20} height={20} />
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {modelName}
        </Text>
      </Flex>
    )
  }

  const getIdentifier = (modelName: string): string => {
    return modelName.toLowerCase().split(/[-._\d]/)[0]
  }

  const sortModelsByIdentifier = (models: ModelPrice[]): ModelPrice[] => {
    const groupedModels = new Map<string, ModelPrice[]>()

    models.forEach((model) => {
      const identifier = getIdentifier(model.name)
      if (!groupedModels.has(identifier)) {
        groupedModels.set(identifier, [])
      }
      groupedModels.get(identifier)!.push(model)
    })

    const sortedEntries = Array.from(groupedModels.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    return sortedEntries.flatMap(([_, models]) => models)
  }

  const columnHelper = createColumnHelper<ModelPrice>()
  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: () => t('key.name'),
      cell: (info) => <ModelComponent modelName={info.getValue()} />
    }),
    columnHelper.accessor((row) => row.prompt, {
      id: 'inputPrice',
      header: () => {
        return (
          <Box position={'relative'}>
            <Flex alignItems={'center'} gap={'4px'}>
              <Text
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('key.inputPrice')}
              </Text>
              <SealosCoin />
              <Text
                color="grayModern.500"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                textTransform="lowercase">
                {t('price.per1kTokens').toLowerCase()}
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
          <Flex alignItems={'center'} gap={'4px'}>
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {t('key.outputPrice')}
            </Text>
            <SealosCoin />
            <Text
              color="grayModern.500"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px"
              textTransform="lowercase">
              {t('price.per1kTokens').toLowerCase()}
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

  console.log('sortedData', sortedData)
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
