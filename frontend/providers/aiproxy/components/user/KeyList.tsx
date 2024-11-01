'use client'
import React, { useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Icon,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Input,
  FormErrorMessage,
  useDisclosure
} from '@chakra-ui/react'
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { TFunction } from 'i18next'
import { createKey, getKeys } from '@/api/platform'

import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChainIcon } from '@/ui/icons/home/Icons'
import { useMutation } from '@tanstack/react-query'
import { useMessage } from '@sealos/ui'
import { useQueryClient } from '@tanstack/react-query'
import { TokenInfo } from '@/types/getKeys'
import SwitchPage from '@/components/SwitchPage'

export function KeyList(): JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Flex direction="column" alignItems="flex-start" gap="8px" alignSelf="stretch" w="full">
        <Text
          color="var(--Black, #000)"
          fontFamily="PingFang SC"
          fontSize="20px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="26px"
          letterSpacing="0.15px">
          {t('keyList.title')}
        </Text>
      </Flex>

      <Flex direction="column" alignItems="flex-start" gap="12px" w="full">
        {/* header */}
        <Flex alignItems="center" alignSelf="stretch" justifyContent="space-between">
          <Flex alignItems="center" gap="8px">
            <ChainIcon boxSize={18} color="grayModern.900" />
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="14px"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px">
              API Endpoint:
            </Text>
            <Text
              color="var(--light-sealos-secondary-text, var(--Bright-Blue-600, #0884DD))"
              fontFamily="PingFang SC"
              fontSize="14px"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px"
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              cursor="pointer">
              <Tooltip label={t('copy')} placement="bottom">
                https://www.aiproxy.com
              </Tooltip>
            </Text>
          </Flex>
          <Button
            display="flex"
            padding="8px 14px"
            justifyContent="center"
            alignItems="center"
            gap="6px"
            borderRadius="6px"
            bg="grayModern.900"
            color="white"
            boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
            _hover={{ bg: 'grayModern.800' }}
            onClick={onOpen}>
            {t('createKey')}
          </Button>
        </Flex>
        {/* table */}
        <ModelKeyTable t={t} />
        {/* modal */}
        <CreateKeyModal isOpen={isOpen} onClose={onClose} t={t} />
      </Flex>
    </>
  )
}

export enum TableHeaderId {
  NAME = 'key.name',
  KEY = 'key.key',
  CREATED_AT = 'key.createdAt',
  LAST_USED_AT = 'key.lastUsedAt',
  STATUS = 'key.status',
  ACTIONS = 'key.actions'
}

const CustomHeader = ({ column, t }: { column: Column<TokenInfo>; t: TFunction }) => {
  return (
    <Text
      color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
      fontFamily="PingFang SC"
      fontSize="12px"
      fontWeight={500}
      lineHeight="16px"
      letterSpacing="0.5px">
      {t(column.id as TableHeaderId)}
    </Text>
  )
}

const ModelKeyTable = ({ t }: { t: TFunction }) => {
  const [keys, setKeys] = useState<TokenInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useQuery(['getKeys', page, pageSize], () => getKeys({ page, perPage: pageSize }), {
    onSuccess: (data) => {
      console.log(data, 'data')
      if (!data.tokens) {
        setKeys([])
        setTotal(0)
        return
      }
      setKeys(data.tokens)
      setTotal(data.total)
    }
  })

  const columnHelper = createColumnHelper<TokenInfo>()

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: TableHeaderId.NAME,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.key, {
      id: TableHeaderId.KEY,
      header: (props) => <CustomHeader column={props.column} t={t} />,
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
    columnHelper.accessor((row) => row.created_at, {
      id: TableHeaderId.CREATED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {new Date(info.getValue()).toLocaleString()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.accessed_at, {
      id: TableHeaderId.LAST_USED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue() ? new Date(info.getValue()).toLocaleString() : '-'}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.status, {
      id: TableHeaderId.STATUS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
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

    columnHelper.display({
      id: TableHeaderId.ACTIONS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Box cursor="pointer" p={1}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.66675 3.33333C6.66675 2.59695 7.2637 2 8.00008 2C8.73646 2 9.33341 2.59695 9.33341 3.33333C9.33341 4.06971 8.73646 4.66667 8.00008 4.66667C7.2637 4.66667 6.66675 4.06971 6.66675 3.33333ZM6.66675 8C6.66675 7.26362 7.2637 6.66667 8.00008 6.66667C8.73646 6.66667 9.33341 7.26362 9.33341 8C9.33341 8.73638 8.73646 9.33333 8.00008 9.33333C7.2637 9.33333 6.66675 8.73638 6.66675 8ZM6.66675 12.6667C6.66675 11.9303 7.2637 11.3333 8.00008 11.3333C8.73646 11.3333 9.33341 11.9303 9.33341 12.6667C9.33341 13.403 8.73646 14 8.00008 14C7.2637 14 6.66675 13.403 6.66675 12.6667Z"
                  fill="#485264"
                />
              </svg>
            </Box>
          </PopoverTrigger>
          <PopoverContent w="120px">
            <PopoverBody p={0}>
              <Flex direction="column" py={1}>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  leftIcon={
                    <Icon viewBox="0 0 24 24" boxSize={4}>
                      <path
                        fill="currentColor"
                        d="M18.536 4.46c-5.95-5.95-15.623-5.95-21.573 0-5.95 5.95-5.95 15.623 0 21.573 5.95 5.95 15.623 5.95 21.573 0 5.95-5.95 5.95-15.623 0-21.573zm-4.95 16.623l-7.623-7.623 7.623-7.623 1.414 1.414-6.209 6.209 6.209 6.209-1.414 1.414z"
                      />
                    </Icon>
                  }
                  color="red.500"
                  onClick={() => console.log('禁用', info.row.original.id)}>
                  禁用
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  leftIcon={
                    <Icon viewBox="0 0 24 24" boxSize={4}>
                      <path
                        fill="currentColor"
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"
                      />
                    </Icon>
                  }
                  color="red.500"
                  onClick={() => console.log('删除', info.row.original.id)}>
                  删除
                </Button>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      )
    })
  ]

  const table = useReactTable({
    data: keys,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Box w="full" h="full" gap="24px">
      <TableContainer w="100%" h="100%" overflow="hidden">
        <Table variant="simple" w="100%" size="md">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr
                key={headerGroup.id}
                height="42px"
                alignSelf="stretch"
                bg="grayModern.100"
                sx={{
                  // 移除表头的下边线
                  th: {
                    borderBottom: 'none' // 移除所有表头单元格的下边线
                  },
                  'th:first-of-type': {
                    borderTopLeftRadius: '6px',
                    borderBottomLeftRadius: '6px'
                  },
                  'th:last-of-type': {
                    borderTopRightRadius: '6px',
                    borderBottomRightRadius: '6px'
                  }
                }}>
                {headerGroup.headers.map((header) => (
                  <Th key={header.id}>
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
      <SwitchPage
        justifyContent={'end'}
        currentPage={page}
        totalPage={Math.ceil(total / pageSize)}
        totalItem={total}
        pageSize={pageSize}
        setCurrentPage={(idx: number) => setPage(idx)}
      />
    </Box>
  )
}

function CreateKeyModal({
  isOpen,
  onClose,
  t
}: {
  isOpen: boolean
  onClose: () => void
  t: TFunction
}) {
  const initialRef = React.useRef(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const createKeyMutation = useMutation((name: string) => createKey(name), {
    onSuccess(data) {
      createKeyMutation.reset()
      setName('')
      queryClient.invalidateQueries(['getAccount']) // Invalidate the cache
      message({
        status: 'success',
        title: t('key.createSuccess'),
        isClosable: true,
        duration: 2000,
        position: 'top'
      })
      onClose()
    },
    onError(err: any) {
      message({
        status: 'warning',
        title: t('key.createFailed'),
        description: err?.message || t('key.createFailed'),
        isClosable: true,
        position: 'top'
      })
    }
  })

  const validateName = (value: string) => {
    if (!value) {
      setError(t('key.nameRequired'))
    } else if (value.length >= 32) {
      setError(t('key.nameMaxLength'))
    } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
      setError(t('key.nameOnlyLettersAndNumbers'))
    } else {
      setError('')
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    validateName(newName)
    setName(newName)
  }

  const handleConfirm = () => {
    if (error === '' && name !== '') {
      createKeyMutation.mutate(name)
      return
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <Flex
        as={ModalContent}
        width="400px"
        flexDirection="column"
        justifyContent="center"
        alignItems="flex-start"
        borderRadius="var(--semilg, 10px)"
        background="var(--White, #FFF)"
        boxShadow="0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)">
        {/* header */}
        <Flex
          as={ModalHeader}
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          borderBottom="1px solid grayModern.100"
          background="grayModern.25"
          w="full">
          <Flex w="360px" justifyContent="space-between" alignItems="center">
            <Flex w="98px" alignItems="center" gap="10px" flexShrink={0}>
              {t('Key.create')}
            </Flex>
            <Flex
              as={ModalCloseButton}
              position="static"
              width="28px"
              height="28px"
              padding="4px"
              borderRadius="4px"
              justifyContent="center"
              alignItems="center"
              gap="10px"
              flexShrink={0}
            />
          </Flex>
        </Flex>
        {/* body */}
        <Flex
          as={ModalBody}
          height="166px"
          padding="24px 36.5px 24px 35.5px"
          justifyContent="center"
          alignItems="center"
          w="full">
          <Flex w="328px" direction="column" alignItems="flex-end" gap="24px">
            <Flex
              direction="column"
              alignItems="flex-start"
              gap="10px"
              alignSelf="stretch"
              w="full">
              <Text
                color="grayModern.900"
                w="full"
                fontFamily="PingFang SC"
                fontSize="14px"
                fontStyle="normal"
                fontWeight={500}
                lineHeight="20px"
                letterSpacing="0.1px">
                {t('key.name')}
              </Text>
              <FormControl isInvalid={!!error}>
                <Input
                  ref={initialRef}
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder={t('key.namePlaceholder')}
                  w="full"
                  height="32px"
                  padding="8px 12px"
                  borderRadius="6px"
                  border="1px solid grayModern.200"
                  background="grayModern.50"
                  _placeholder={{
                    color: 'grayModern.400'
                  }}
                  isDisabled={createKeyMutation.isLoading}
                />
                {error && <FormErrorMessage>{error}</FormErrorMessage>}
              </FormControl>
            </Flex>
            {/* button */}
            <Flex
              w="full"
              justifyContent="flex-end"
              alignItems="center"
              alignSelf="stretch"
              gap="12px">
              <Button
                display="flex"
                width="64px"
                padding="var(--md, 8px) 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                background="grayModern.900"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                _hover={{ background: 'var(--Gray-Modern-800, #1F2937)' }}
                onClick={handleConfirm}
                isDisabled={!!error}
                isLoading={createKeyMutation.isLoading}>
                {t('confirm')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  )
}

export default KeyList
