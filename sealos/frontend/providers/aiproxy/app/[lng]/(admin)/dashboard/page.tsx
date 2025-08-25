'use client'
import { Button, Flex, Text, useDisclosure, useToast } from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import ChannelTable from './components/ChannelTable'
import UpdateChannelModal from './components/UpdateChannelModal'
import { useState, useRef } from 'react'
import { ChannelInfo } from '@/types/admin/channels/channelInfo'
import { getAllChannels, uploadChannels } from '@/api/platform'
import { QueryKey } from '@/types/query-key'
import { downloadJson } from '@/utils/common'
import { useMessage } from '@sealos/ui'

export default function DashboardPage() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [operationType, setOperationType] = useState<'create' | 'update'>('create')
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [exportData, setExportData] = useState<ChannelInfo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const queryClient = useQueryClient()

  const {
    data: allChannels,
    isFetching: isAllChannelsFetching,
    refetch
  } = useQuery({
    queryKey: [QueryKey.GetAllChannels],
    queryFn: getAllChannels,
    refetchOnReconnect: false,
    enabled: false
  })

  const uploadMutation = useMutation({
    mutationFn: uploadChannels
  })

  const handleExport = async () => {
    if (exportData.length === 0) {
      const result = await refetch()
      const dataToExport = result.data || []
      downloadJson(dataToExport, 'channels')
    } else {
      downloadJson(exportData, 'channels')
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      await uploadMutation.mutateAsync(formData)
      message({
        title: t('dashboard.importSuccess'),
        status: 'success',
        duration: 3000,
        isClosable: true
      })
      queryClient.invalidateQueries([QueryKey.GetChannels])
      queryClient.invalidateQueries([QueryKey.GetChannelTypeNames])
    } catch (error) {
      console.error('Import error:', error)
      message({
        title: t('dashboard.importError'),
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Flex pt="4px" pb="12px" pr="12px" h="full" width="full">
      <Flex
        bg="white"
        gap="16px"
        pt="24px"
        pl="32px"
        pr="32px"
        pb="18px"
        flexDirection="column"
        borderRadius="12px"
        w="full"
        flex="1">
        {/* header */}
        <Flex w="full" alignSelf="stretch" alignItems="center" justifyContent="space-between">
          <Text
            whiteSpace="nowrap"
            color="black"
            fontFamily="PingFang SC"
            fontSize="20px"
            fontStyle="normal"
            fontWeight="500"
            lineHeight="26px"
            letterSpacing="0.15px">
            {t('dashboard.title')}
          </Text>

          <Flex justifyContent="flex-end" alignContent="center" gap="12px">
            <Button
              display="flex"
              padding="8px 14px"
              justifyContent="center"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              bg="#111824"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
              color="white"
              fontSize="12px"
              fontFamily="PingFang SC"
              fontWeight="500"
              whiteSpace="nowrap"
              lineHeight="16px"
              letterSpacing="0.5px"
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
              }}
              onClick={() => {
                setOperationType('create')
                onOpen()
              }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.99996 2.66675C8.36815 2.66675 8.66663 2.96522 8.66663 3.33341V7.33341H12.6666C13.0348 7.33341 13.3333 7.63189 13.3333 8.00008C13.3333 8.36827 13.0348 8.66675 12.6666 8.66675H8.66663V12.6667C8.66663 13.0349 8.36815 13.3334 7.99996 13.3334C7.63177 13.3334 7.33329 13.0349 7.33329 12.6667V8.66675H3.33329C2.9651 8.66675 2.66663 8.36827 2.66663 8.00008C2.66663 7.63189 2.9651 7.33341 3.33329 7.33341H7.33329V3.33341C7.33329 2.96522 7.63177 2.66675 7.99996 2.66675Z"
                  fill="white"
                />
              </svg>
              {t('dashboard.create')}
            </Button>
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                style={{ display: 'none' }}
              />
              <Button
                onClick={handleImport}
                isLoading={uploadMutation.isLoading}
                display="flex"
                padding="8px 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                bg="#111824"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                color="white"
                fontSize="12px"
                fontFamily="PingFang SC"
                fontWeight="500"
                whiteSpace="nowrap"
                lineHeight="16px"
                letterSpacing="0.5px"
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
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    d="M4.67403 1.54568C4.67403 1.42836 4.57892 1.33325 4.4616 1.33325C2.77074 1.33325 1.40002 2.70397 1.40002 4.39483V11.605C1.40002 13.2959 2.77074 14.6666 4.4616 14.6666H11.6718C13.3626 14.6666 14.7334 13.2959 14.7334 11.605V4.39483C14.7334 2.70397 13.3626 1.33325 11.6718 1.33325H10.1347C9.76646 1.33325 9.46799 1.63173 9.46799 1.99992C9.46799 2.36811 9.76646 2.66659 10.1347 2.66659H11.6718C12.6263 2.66659 13.4 3.44035 13.4 4.39483V11.605C13.4 12.5595 12.6263 13.3333 11.6718 13.3333H4.4616C3.50712 13.3333 2.73336 12.5595 2.73336 11.605V4.39483C2.73336 3.44035 3.50712 2.66659 4.4616 2.66659C4.57892 2.66659 4.67403 2.57148 4.67403 2.45416V1.54568Z"
                    fill="white"
                  />
                  <path
                    d="M7.44956 4.7593C7.34366 4.01775 7.12184 3.5521 6.74895 3.28889C5.86143 2.66241 5.20264 2.6666 5.10574 2.66722L5.09932 2.66725H4.43265V1.33392H5.09932C5.33405 1.33392 6.3067 1.34467 7.51785 2.1996C8.33657 2.77751 8.64402 3.69217 8.7695 4.5708C8.87184 5.28739 8.86613 6.09283 8.86087 6.83489C8.85974 6.99521 8.85862 7.15259 8.85862 7.30546C8.85862 7.73754 8.84937 8.14339 8.83572 8.50719L9.39676 7.94615C9.65711 7.6858 10.0792 7.6858 10.3396 7.94615C10.5999 8.2065 10.5999 8.6286 10.3396 8.88896L8.58245 10.6461C8.441 10.7875 8.25178 10.8521 8.06671 10.8399C7.88163 10.8521 7.69242 10.7875 7.55096 10.6461L5.79384 8.88896C5.53349 8.6286 5.53349 8.2065 5.79384 7.94615C6.05419 7.6858 6.4763 7.6858 6.73665 7.94615L7.41135 8.62084L7.49316 8.70266C7.51162 8.29469 7.52529 7.81909 7.52529 7.30546C7.52529 7.12915 7.52639 6.95576 7.52746 6.78545C7.53213 6.04759 7.53644 5.36763 7.44956 4.7593Z"
                    fill="white"
                  />
                </svg>
                {t('dashboard.import')}
              </Button>
            </>
            <Button
              onClick={handleExport}
              isLoading={isAllChannelsFetching}
              display="flex"
              padding="8px 14px"
              justifyContent="center"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              bg="#111824"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
              color="white"
              fontSize="12px"
              fontFamily="PingFang SC"
              fontWeight="500"
              lineHeight="16px"
              whiteSpace="nowrap"
              letterSpacing="0.5px"
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
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.52851 1.52851C7.78886 1.26816 8.21097 1.26816 8.47132 1.52851L11.138 4.19518C11.3983 4.45553 11.3983 4.87764 11.138 5.13799C10.8776 5.39834 10.4555 5.39834 10.1952 5.13799L8.66659 3.60939V9.99992C8.66659 10.3681 8.36811 10.6666 7.99992 10.6666C7.63173 10.6666 7.33325 10.3681 7.33325 9.99992V3.60939L5.80466 5.13799C5.54431 5.39834 5.1222 5.39834 4.86185 5.13799C4.6015 4.87764 4.6015 4.45553 4.86185 4.19518L7.52851 1.52851ZM1.99992 7.33325C2.36811 7.33325 2.66659 7.63173 2.66659 7.99992V10.7999C2.66659 11.371 2.6671 11.7592 2.69162 12.0592C2.7155 12.3515 2.75878 12.501 2.81191 12.6052C2.93974 12.8561 3.14372 13.0601 3.3946 13.1879C3.49887 13.2411 3.64833 13.2843 3.94061 13.3082C4.24067 13.3327 4.62887 13.3333 5.19992 13.3333H10.7999C11.371 13.3333 11.7592 13.3327 12.0592 13.3082C12.3515 13.2843 12.501 13.2411 12.6052 13.1879C12.8561 13.0601 13.0601 12.8561 13.1879 12.6052C13.2411 12.501 13.2843 12.3515 13.3082 12.0592C13.3327 11.7592 13.3333 11.371 13.3333 10.7999V7.99992C13.3333 7.63173 13.6317 7.33325 13.9999 7.33325C14.3681 7.33325 14.6666 7.63173 14.6666 7.99992V10.8275C14.6666 11.3641 14.6666 11.807 14.6371 12.1678C14.6065 12.5425 14.5408 12.887 14.3759 13.2106C14.1203 13.7123 13.7123 14.1203 13.2106 14.3759C12.887 14.5408 12.5425 14.6065 12.1678 14.6371C11.807 14.6666 11.3641 14.6666 10.8275 14.6666H5.17237C4.63573 14.6666 4.19283 14.6666 3.83204 14.6371C3.4573 14.6065 3.11283 14.5408 2.78928 14.3759C2.28751 14.1203 1.87956 13.7123 1.6239 13.2106C1.45904 12.887 1.39333 12.5425 1.36271 12.1678C1.33324 11.807 1.33324 11.3641 1.33325 10.8275L1.33325 7.99992C1.33325 7.63173 1.63173 7.33325 1.99992 7.33325Z"
                  fill="white"
                />
              </svg>
              {exportData.length > 0 ? t('dashboard.export') : t('dashboard.exportAll')}
            </Button>
          </Flex>
        </Flex>
        {/* header end */}
        {/* table */}
        <ChannelTable exportData={setExportData} />
        {/* modal */}
        <UpdateChannelModal isOpen={isOpen} onClose={onClose} operationType={operationType} />
      </Flex>
    </Flex>
  )
}
