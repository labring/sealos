'use client'

import { Box, Flex, Text, Button, Center } from '@chakra-ui/react'
import { CurrencySymbol, MySelect } from '@sealos/ui'
import { useState } from 'react'

import { getDashboardData } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { UseQueryResult, useQuery } from '@tanstack/react-query'
import { QueryKey } from '@/types/query-key'
import { useBackendStore } from '@/store/backend'
import RequestDataChart from './components/RequestDataChart'
import { DashboardResponse } from '@/types/user/dashboard'

export default function Home(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  const [tokenName, setTokenName] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [type, setType] = useState<'week' | 'day' | 'two_week' | 'month'>('week') // default is week

  const { data: dashboardData, isLoading }: UseQueryResult<DashboardResponse['data']> = useQuery(
    [QueryKey.GetDashboardData, type, tokenName, model],
    () =>
      getDashboardData({
        type,
        ...(tokenName && { token_name: tokenName }),
        ...(model && { model })
      })
  )

  return (
    <Flex
      pt="4px"
      pb="12px"
      pr="12px"
      h="100vh"
      width="full"
      flexDirection="column"
      overflow="hidden">
      <Flex
        bg="white"
        px="32px"
        pt="24px"
        pb="12px"
        gap="20px"
        borderRadius="12px"
        flexDirection="column"
        h="full"
        w="full"
        flex="1">
        {/* -- header */}
        <Flex
          w="full"
          justifyContent="space-between"
          alignItems="center"
          alignSelf="stretch"
          gap="24px"
          flexWrap="wrap">
          <Flex gap="24px" alignItems="center">
            <Text
              color="black"
              fontFamily="PingFang SC"
              fontSize="20px"
              fontStyle="normal"
              fontWeight="500"
              lineHeight="26px"
              letterSpacing="0.15px"
              whiteSpace="nowrap">
              {t('dataDashboard.title')}
            </Text>
            <Flex gap="12px" alignItems="center">
              <MySelect
                w="200px"
                boxStyle={{
                  w: '100%'
                }}
                height="36px"
                value={tokenName}
                list={[
                  {
                    value: 'all',
                    label: 'all'
                  },
                  ...(dashboardData?.token_names?.map((token) => ({
                    value: token,
                    label: token
                  })) || [])
                ]}
                placeholder={t('dataDashboard.selectToken')}
                onchange={(token: string) => {
                  if (token === 'all') {
                    setTokenName('')
                  } else {
                    setTokenName(token)
                  }
                }}
              />

              <MySelect
                boxStyle={{
                  w: '100%'
                }}
                w="200px"
                height="36px"
                placeholder={t('dataDashboard.selectModel')}
                value={model}
                list={[
                  {
                    value: 'all',
                    label: 'all'
                  },
                  ...(dashboardData?.models?.map((model) => ({
                    value: model,
                    label: model
                  })) || [])
                ]}
                onchange={(model: string) => {
                  if (model === 'all') {
                    setModel('')
                  } else {
                    setModel(model)
                  }
                }}
              />
            </Flex>
          </Flex>
          <Flex
            gap="4px"
            alignItems="flex-start"
            p="3px"
            borderColor="gray.200"
            bg="grayModern.50"
            borderRadius="6px">
            {[
              { label: t('dataDashboard.day'), value: 'day' },
              { label: t('dataDashboard.week'), value: 'week' },
              { label: t('dataDashboard.twoWeek'), value: 'two_week' },
              { label: t('dataDashboard.month'), value: 'month' }
            ].map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                display="flex"
                px="10px"
                py="5px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="4px"
                color={type === item.value ? '#0884DD' : 'grayModern.500'}
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight="500"
                lineHeight="20px"
                fontStyle="normal"
                letterSpacing="0.1px"
                bg={type === item.value ? 'white' : 'transparent'}
                onClick={() => setType(item.value as typeof type)}
                _hover={{
                  bg: 'white',
                  color: '#0884DD',
                  boxShadow:
                    '0px 1px 2px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.15)'
                }}>
                {item.label}
              </Button>
            ))}
          </Flex>
        </Flex>
        {/* -- header end */}

        <Flex
          w="full"
          h="full"
          gap="38px"
          alignItems="flex-start"
          justifyContent="center"
          flexDirection="column"
          overflowY="auto"
          overflowX="hidden"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}>
          {/* chart 1 */}
          <Flex
            w="full"
            gap="16px"
            alignItems="center"
            overflowY="hidden"
            overflowX="auto"
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
            <Flex
              flex="1"
              bg="#EDFAFF"
              gap="16px"
              borderRadius="12px"
              px="20px"
              py="28px"
              alignItems="center"
              alignSelf="stretch">
              <Box
                display="flex"
                alignItems="center"
                p="8px"
                borderRadius="999px"
                bg="white"
                boxShadow="0px 4px 16px -1px rgba(19, 51, 107, 0.02)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none">
                  <path
                    d="M13.3333 3.66656C13.3333 2.83814 14.0049 2.16656 14.8333 2.16656C15.6618 2.16656 16.3333 2.83814 16.3333 3.66656V20.6666C16.3333 21.495 15.6618 22.1666 14.8333 22.1666C14.0049 22.1666 13.3333 21.495 13.3333 20.6666V3.66656Z"
                    fill="#219BF4"
                  />
                  <path
                    d="M3.5 9.16656C2.67157 9.16656 2 9.83814 2 10.6666V20.6666C2 21.495 2.67157 22.1666 3.5 22.1666C4.32843 22.1666 5 21.495 5 20.6666V10.6666C5 9.83814 4.32843 9.16656 3.5 9.16656Z"
                    fill="#219BF4"
                  />
                  <path
                    d="M9.16667 13.1666C8.33824 13.1666 7.66667 13.8381 7.66667 14.6666V20.6666C7.66667 21.495 8.33824 22.1666 9.16667 22.1666C9.99509 22.1666 10.6667 21.495 10.6667 20.6666V14.6666C10.6667 13.8381 9.99509 13.1666 9.16667 13.1666Z"
                    fill="#219BF4"
                  />
                  <path
                    d="M20.5 8.16656C19.6716 8.16656 19 8.83814 19 9.66656V20.6666C19 21.495 19.6716 22.1666 20.5 22.1666C21.3284 22.1666 22 21.495 22 20.6666V9.66656C22 8.83814 21.3284 8.16656 20.5 8.16656Z"
                    fill="#219BF4"
                  />
                </svg>
              </Box>
              <Flex flexDirection="column" alignItems="flex-start">
                <Text
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="14px"
                  fontWeight="400"
                  lineHeight="20px"
                  letterSpacing="0.25px">
                  {t('dataDashboard.callCount')}
                </Text>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="32px"
                  fontWeight="500"
                  lineHeight="40px">
                  {dashboardData?.total_count
                    ? dashboardData.total_count >= 10000
                      ? `${Number((dashboardData.total_count / 10000).toFixed(3))}W`
                      : dashboardData.total_count.toLocaleString()
                    : 0}
                </Text>
              </Flex>
            </Flex>

            <Flex
              flex="1"
              bg="yellow.50"
              gap="16px"
              borderRadius="12px"
              px="20px"
              py="28px"
              alignItems="center"
              alignSelf="stretch">
              <Box
                display="flex"
                alignItems="center"
                p="8px"
                borderRadius="999px"
                bg="white"
                boxShadow="0px 4px 16px -1px rgba(19, 51, 107, 0.02)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10.528 2.50103C10.9773 2.24808 11.4842 2.11519 11.9998 2.11519C12.5154 2.11519 13.0223 2.24808 13.4716 2.50103C13.9209 2.75398 14.2974 3.11846 14.5648 3.5593L14.5677 3.56405L23.0376 17.7041L23.0458 17.7179C23.3077 18.1715 23.4463 18.6858 23.4478 19.2097C23.4493 19.7335 23.3135 20.2486 23.0541 20.7037C22.7947 21.1588 22.4207 21.538 21.9692 21.8036C21.5177 22.0693 21.0046 22.2121 20.4808 22.2179L20.4698 22.218L3.51879 22.2179C2.99498 22.2122 2.48182 22.0693 2.03035 21.8036C1.57887 21.538 1.20483 21.1588 0.945426 20.7037C0.686022 20.2486 0.550303 19.7335 0.55177 19.2097C0.553236 18.6858 0.691839 18.1715 0.953786 17.7179L0.961909 17.7041L9.43476 3.5593C9.70217 3.11846 10.0787 2.75398 10.528 2.50103ZM11.9998 4.11519C11.8279 4.11519 11.6589 4.15948 11.5092 4.2438C11.3601 4.32774 11.235 4.44852 11.146 4.59457L2.68246 18.7238C2.59729 18.8736 2.55224 19.0429 2.55176 19.2153C2.55127 19.3899 2.59651 19.5616 2.68298 19.7133C2.76945 19.865 2.89413 19.9914 3.04462 20.0799C3.1938 20.1677 3.36317 20.2152 3.53617 20.2179H20.4634C20.6364 20.2152 20.8058 20.1677 20.9549 20.0799C21.1054 19.9914 21.2301 19.865 21.3166 19.7133C21.403 19.5616 21.4483 19.3899 21.4478 19.2153C21.4473 19.0429 21.4023 18.8736 21.3171 18.7238L12.8548 4.59656C12.8544 4.5959 12.854 4.59523 12.8536 4.59457C12.7645 4.44852 12.6395 4.32774 12.4904 4.2438C12.3406 4.15948 12.1716 4.11519 11.9998 4.11519ZM11.9998 8.21793C12.5521 8.21793 12.9998 8.66565 12.9998 9.21793V13.2179C12.9998 13.7702 12.5521 14.2179 11.9998 14.2179C11.4475 14.2179 10.9998 13.7702 10.9998 13.2179V9.21793C10.9998 8.66565 11.4475 8.21793 11.9998 8.21793ZM10.9998 17.2179C10.9998 16.6656 11.4475 16.2179 11.9998 16.2179H12.0098C12.5621 16.2179 13.0098 16.6656 13.0098 17.2179C13.0098 17.7702 12.5621 18.2179 12.0098 18.2179H11.9998C11.4475 18.2179 10.9998 17.7702 10.9998 17.2179Z"
                    fill="#F79009"
                  />
                </svg>
              </Box>
              <Flex flexDirection="column" alignItems="flex-start">
                <Text
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="14px"
                  fontWeight="400"
                  lineHeight="20px"
                  letterSpacing="0.25px">
                  {t('dataDashboard.exceptionCount')}
                </Text>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="32px"
                  fontWeight="500"
                  lineHeight="40px">
                  {dashboardData?.exception_count || 0}
                </Text>
              </Flex>
            </Flex>

            <Flex
              flex="1"
              bg="#F0F4FF"
              gap="16px"
              borderRadius="12px"
              px="20px"
              py="28px"
              alignItems="center"
              alignSelf="stretch">
              <Box
                display="flex"
                alignItems="center"
                p="8px"
                borderRadius="999px"
                bg="white"
                boxShadow="0px 4px 16px -1px rgba(19, 51, 107, 0.02)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M21.1198 3.04655C20.5802 2.5059 19.6272 2.37234 18.907 2.27297L18.6345 2.23878C17.5061 2.11748 16.3664 2.14911 15.2464 2.33281C12.4544 2.78584 9.12289 4.2721 6.54357 8.00539C6.25342 8.03346 5.95718 8.02308 5.65981 8.01265L5.63536 8.0118L5.40029 8.00432C5.00923 7.99363 4.6203 8.00004 4.24633 8.10689C3.54113 8.3099 3.07634 9.03327 2.74298 9.70855L2.58591 10.0398L2.39679 10.4672L2.27925 10.7599C1.99076 11.5164 1.78882 12.4257 2.38717 13.023C2.62061 13.2569 2.92148 13.4342 3.25236 13.5799C3.61968 13.7417 4.02398 13.8644 4.41408 13.9825L4.71005 14.0733C4.82891 14.1093 4.94696 14.1479 5.0641 14.1891L5.07451 14.1927C5.13814 14.2152 5.20151 14.2384 5.2646 14.2624L5.33298 14.2902L5.2475 14.3725C5.23379 14.3862 5.22024 14.4001 5.20684 14.4143L5.19987 14.4218C4.85655 14.789 4.61354 15.3112 4.44186 15.7455C4.39572 15.8614 4.35099 15.9809 4.30772 16.1026C4.16666 16.4996 4.0412 16.9204 3.93327 17.3162L3.83283 17.7008L3.70034 18.2457L3.53579 18.9915L3.4439 19.4521C3.42667 19.5451 3.42182 19.6397 3.42921 19.7334C3.43549 19.813 3.45059 19.8919 3.47444 19.9686C3.52636 20.1358 3.61817 20.2878 3.74195 20.4116C3.86572 20.5354 4.01775 20.6272 4.18492 20.6791C4.26584 20.7043 4.34913 20.7197 4.43305 20.7253C4.52251 20.7313 4.6127 20.7261 4.70151 20.7097L5.04663 20.6423L5.59903 20.5248L6.06062 20.418L6.57028 20.2908L6.83634 20.2203C7.28912 20.0971 7.77381 19.951 8.21895 19.7856C8.28324 19.7617 8.34671 19.7374 8.40915 19.7128C8.46233 19.6916 8.51686 19.6693 8.57227 19.6459C8.98888 19.4702 9.45573 19.2314 9.78108 18.9061C9.85738 18.8296 9.92977 18.7494 9.99798 18.6656C10.06 18.8259 10.1177 18.9851 10.1711 19.1411C10.1942 19.2142 10.2162 19.2876 10.2372 19.3613L10.2375 19.3625C10.2944 19.5624 10.3435 19.7644 10.3848 19.9681L10.435 20.1893C10.4878 20.4193 10.5453 20.6498 10.6198 20.8694C10.7367 21.214 10.8954 21.5319 11.1434 21.7792C11.8197 22.4566 12.8989 22.1083 13.6981 21.7685L14.1255 21.5805L14.4568 21.4234C15.1331 21.09 15.8565 20.6252 16.0595 19.92C16.1898 19.4661 16.1727 19 16.1557 18.5332L16.145 18.2297C16.1407 18.0267 16.1418 17.8237 16.1621 17.6228C19.8943 15.0435 21.3805 11.712 21.8336 8.92001C22.0633 7.50533 22.028 6.2317 21.8934 5.25938L21.8336 4.84695C21.7321 4.20586 21.5622 3.48784 21.1198 3.04655ZM19.8013 5.15594C19.7581 4.88618 19.7138 4.69207 19.6648 4.5524C19.66 4.53861 19.6554 4.52631 19.6512 4.5154C19.6193 4.50301 19.5747 4.48751 19.5149 4.47037C19.284 4.40421 19.0117 4.36259 18.6384 4.311L18.3975 4.28077C17.4587 4.18142 16.5107 4.20851 15.5791 4.36132L15.5756 4.36188C13.2543 4.73856 10.452 5.96464 8.2348 9.17385L7.69202 9.95946L6.74158 10.0514C6.31181 10.093 5.89231 10.078 5.61637 10.068L5.56669 10.0663L5.3398 10.059C5.12707 10.0533 4.99857 10.0578 4.9185 10.0655C4.83218 10.1693 4.72342 10.3422 4.59291 10.605L4.45481 10.8962L4.29107 11.2662L4.19412 11.5078C4.16552 11.5835 4.14151 11.6526 4.12178 11.7156C7.263 12.2049 9.2252 13.4294 10.4536 14.8516L10.455 14.8499L10.4831 14.886C10.7396 15.1865 10.9636 15.4957 11.1593 15.8084C12.1725 17.4268 12.3957 19.1067 12.5098 19.9652L12.5174 20.0228C12.6289 19.9851 12.75 19.9377 12.8827 19.8815L13.271 19.7106L13.561 19.5732C13.8257 19.4419 13.9992 19.3326 14.1028 19.2461C14.1131 19.1428 14.1145 18.9669 14.1014 18.6084L14.1013 18.6055L14.0901 18.2875L14.0898 18.273C14.0849 18.0411 14.0841 17.7408 14.1169 17.4161L14.2123 16.4715L14.9934 15.9317C18.2016 13.7145 19.4279 10.912 19.8045 8.59052C19.998 7.39921 19.9665 6.33498 19.8581 5.54743L19.8013 5.15594ZM8.22458 17.4358C8.24012 17.4229 8.25535 17.4097 8.27024 17.3963C8.45329 17.2133 8.56371 16.9702 8.581 16.712C8.59829 16.4537 8.52128 16.198 8.36427 15.9923L8.27665 15.8919L8.25101 15.8673L8.15057 15.7818C7.98241 15.6573 7.78143 15.5849 7.57252 15.5735C7.36361 15.5621 7.15595 15.6123 6.97524 15.7177L6.85771 15.7968L6.75834 15.8855L6.62478 16.0543C6.46925 16.2792 6.35123 16.5523 6.2559 16.8403L6.25301 16.8491C6.17939 17.0728 6.11935 17.3053 6.06596 17.5309L5.95056 18.031L5.89607 18.2586L6.10015 18.2094L6.54678 18.1068C6.8407 18.0382 7.14987 17.9599 7.43858 17.8557L7.45213 17.8508C7.74341 17.7447 8.0132 17.6119 8.22458 17.4358ZM14.2163 12.1666C15.4389 12.1666 16.43 11.1755 16.43 9.95286C16.43 8.73027 15.4389 7.73916 14.2163 7.73916C12.9937 7.73916 12.0026 8.73027 12.0026 9.95286C12.0026 11.1755 12.9937 12.1666 14.2163 12.1666Z"
                    fill="#3370FF"
                  />
                </svg>
              </Box>
              <Flex flexDirection="column" alignItems="flex-start">
                <Text
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="14px"
                  fontWeight="400"
                  lineHeight="20px"
                  letterSpacing="0.25px">
                  {t('dataDashboard.rpm')}
                </Text>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="32px"
                  fontWeight="500"
                  lineHeight="40px">
                  {dashboardData?.rpm || 0}
                </Text>
              </Flex>
            </Flex>

            <Flex
              flex="1"
              bg="purple.50"
              gap="16px"
              borderRadius="12px"
              px="20px"
              py="28px"
              alignItems="center"
              alignSelf="stretch">
              <Box
                display="flex"
                alignItems="center"
                p="8px"
                borderRadius="999px"
                bg="white"
                boxShadow="0px 4px 16px -1px rgba(19, 51, 107, 0.02)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none">
                  <path
                    d="M8.39407 10.6488C9.49864 10.6488 10.3941 9.75332 10.3941 8.64875C10.3941 7.54418 9.49864 6.64875 8.39407 6.64875C7.2895 6.64875 6.39407 7.54418 6.39407 8.64875C6.39407 9.75332 7.2895 10.6488 8.39407 10.6488Z"
                    fill="#6F5DD7"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.79475 1.80801C3.05296 1.80801 1.64096 3.22001 1.64096 4.96181V10.6545C1.64096 10.7076 1.64309 10.7606 1.64735 10.8132C1.68246 11.7079 2.04236 12.595 2.72593 13.2786L10.891 21.4437C12.3329 22.8856 14.6707 22.8856 16.1126 21.4437L21.2776 16.2787C22.7195 14.8368 22.7195 12.499 21.2776 11.0571L13.1125 2.89201C12.422 2.20152 11.5239 1.84134 10.6201 1.81247C10.5761 1.8095 10.5318 1.80801 10.4874 1.80801H4.79475ZM3.64096 4.96181C3.64096 4.32458 4.15753 3.80801 4.79475 3.80801H10.4863L10.5142 3.81037L10.544 3.8111C10.9642 3.82149 11.3783 3.98619 11.6983 4.30623L19.8634 12.4713C20.5243 13.1322 20.5243 14.2036 19.8634 14.8645L14.6984 20.0295C14.0375 20.6903 12.9661 20.6903 12.3052 20.0295L4.14014 11.8644C3.82269 11.5469 3.65813 11.137 3.64531 10.7204L3.64423 10.6855L3.64096 10.653V4.96181Z"
                    fill="#6F5DD7"
                  />
                </svg>
              </Box>
              <Flex flexDirection="column" alignItems="flex-start">
                <Text
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="14px"
                  fontWeight="400"
                  lineHeight="20px"
                  letterSpacing="0.25px">
                  {t('dataDashboard.tpm')}
                </Text>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="32px"
                  fontWeight="500"
                  lineHeight="40px">
                  {dashboardData?.tpm || 0}
                </Text>
              </Flex>
            </Flex>

            <Flex
              flex="1"
              bg="teal.50"
              gap="16px"
              borderRadius="12px"
              px="20px"
              py="28px"
              alignItems="center"
              alignSelf="stretch">
              <Box
                display="flex"
                alignItems="center"
                p="8px"
                borderRadius="999px"
                bg="white"
                boxShadow="0px 4px 16px -1px rgba(19, 51, 107, 0.02)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.9999 1.90797L12.0106 1.90809C13.2789 1.92155 14.6236 2.18541 15.6855 2.85917C16.797 3.56441 17.5621 4.70514 17.5621 6.27869C17.5621 6.8024 17.4244 7.28529 17.1979 7.71633C19.7487 9.43884 21.6996 12.34 21.6996 15.6884C21.6996 18.0511 20.5481 19.7896 18.7203 20.8896C16.9485 21.9558 14.5704 22.4139 12.0043 22.4251L11.9956 22.4252C9.42951 22.4139 7.05135 21.9558 5.27958 20.8896C3.4518 19.7896 2.30023 18.0511 2.30023 15.6884C2.30023 12.34 4.25118 9.43884 6.80193 7.71633C6.57551 7.28529 6.43779 6.8024 6.43779 6.27869C6.43779 4.70514 7.20283 3.56441 8.31437 2.85917C9.37627 2.18541 10.721 1.92155 11.9893 1.90809L11.9999 1.90797ZM9.38585 4.54793C8.79548 4.92251 8.43779 5.45482 8.43779 6.27869C8.43779 6.55213 8.56138 6.87345 8.88821 7.21424C9.37754 7.72447 9.27701 8.5898 8.62124 8.94751C6.15875 10.2907 4.30023 12.8555 4.30023 15.6884C4.30023 17.2834 5.02534 18.4024 6.31082 19.1759C7.6515 19.9827 9.62159 20.4142 11.9999 20.4251C14.3783 20.4142 16.3484 19.9827 17.689 19.1759C18.9745 18.4024 19.6996 17.2834 19.6996 15.6884C19.6996 12.8555 17.8411 10.2907 15.3786 8.94751C14.7229 8.5898 14.6223 7.72447 15.1117 7.21424C15.4385 6.87345 15.5621 6.55213 15.5621 6.27869C15.5621 5.45482 15.2044 4.92251 14.614 4.54793C13.9762 4.14323 13.044 3.92061 11.9999 3.90809C10.9559 3.92061 10.0237 4.14323 9.38585 4.54793Z"
                    fill="#00A9A6"
                  />
                  <path
                    d="M11.6248 10.4908C11.7537 10.1425 12.2462 10.1425 12.3751 10.4908L13.131 12.5335C13.1715 12.6429 13.2578 12.7293 13.3673 12.7698L15.41 13.5257C15.7582 13.6545 15.7582 14.1471 15.41 14.2759L13.3673 15.0318C13.2578 15.0723 13.1715 15.1586 13.131 15.2681L12.3751 17.3108C12.2462 17.6591 11.7537 17.6591 11.6248 17.3108L10.869 15.2681C10.8284 15.1586 10.7421 15.0723 10.6326 15.0318L8.58995 14.2759C8.2417 14.1471 8.2417 13.6545 8.58995 13.5257L10.6326 12.7698C10.7421 12.7293 10.8284 12.6429 10.869 12.5335L11.6248 10.4908Z"
                    fill="#00A9A6"
                  />
                </svg>
              </Box>
              <Flex flexDirection="column" alignItems="flex-start">
                <Flex alignItems="center" justifyContent="center" gap="2px">
                  <Text
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontStyle="normal"
                    fontSize="14px"
                    fontWeight="400"
                    lineHeight="20px"
                    letterSpacing="0.25px">
                    {t('dataDashboard.cost')}
                  </Text>
                  {currencySymbol === 'shellCoin' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none">
                      <circle
                        cx="7"
                        cy="7.4854"
                        r="6.74"
                        fill="url(#paint0_linear_802_289)"
                        stroke="url(#paint1_linear_802_289)"
                        strokeWidth="0.52"
                      />
                      <circle
                        cx="6.99996"
                        cy="7.48542"
                        r="6.11562"
                        fill="url(#paint2_linear_802_289)"
                      />
                      <path
                        d="M7.00004 13.601C10.3776 13.601 13.1157 10.863 13.1157 7.48541C13.1157 6.09903 12.6543 4.82038 11.8768 3.79462C11.4855 3.73941 11.0856 3.71085 10.679 3.71085C6.28906 3.71085 2.67666 7.0397 2.22829 11.3108C3.34913 12.7072 5.07019 13.601 7.00004 13.601Z"
                        fill="url(#paint3_linear_802_289)"
                      />
                      <circle
                        cx="7.00007"
                        cy="7.48539"
                        r="4.74284"
                        fill="url(#paint4_linear_802_289)"
                      />
                      <path
                        d="M5.0457 7.27105C5.43915 7.84631 6.25318 7.79525 6.25318 7.79525C6.04967 7.59782 5.91739 7.41741 5.90383 6.90342C5.89026 6.38943 5.59856 6.25328 5.59856 6.25328C6.1209 5.9231 5.93435 5.56569 5.91739 5.16743C5.90722 4.91895 6.05307 4.73514 6.16839 4.62962C5.50464 4.7294 4.90487 5.08243 4.49413 5.61512C4.0834 6.14782 3.89338 6.81905 3.96371 7.4889C4.0112 7.35614 4.68277 6.74004 5.0457 7.27105Z"
                        fill="url(#paint5_linear_802_289)"
                      />
                      <path
                        d="M9.86551 6.24649C9.84796 6.19055 9.82642 6.13595 9.80106 6.08311V6.0797C9.68269 5.83801 9.48642 5.64355 9.2441 5.52785C9.00177 5.41215 8.72761 5.382 8.46607 5.4423C8.20453 5.5026 7.97096 5.6498 7.80325 5.86003C7.63554 6.07027 7.54352 6.3312 7.54212 6.6005C7.54214 6.6852 7.55123 6.76965 7.56925 6.85239C7.56933 6.85352 7.56933 6.85466 7.56925 6.85579C7.57603 6.88983 7.58621 6.92387 7.59638 6.95791C7.65692 7.1977 7.6687 7.44727 7.63102 7.69172C7.59334 7.93618 7.50697 8.17051 7.37706 8.38073C7.24716 8.59095 7.07638 8.77275 6.87493 8.91528C6.67348 9.05781 6.44548 9.15815 6.20453 9.21031C5.96359 9.26246 5.71465 9.26537 5.47256 9.21886C5.23047 9.17234 5.0002 9.07735 4.7955 8.93957C4.5908 8.80178 4.41585 8.62402 4.28111 8.41689C4.14636 8.20976 4.05458 7.97751 4.01124 7.734C4.07253 8.15611 4.22146 8.56059 4.4484 8.92127C4.67533 9.28194 4.97521 9.59077 5.32862 9.82776C5.68204 10.0648 6.0811 10.2246 6.49998 10.297C6.91886 10.3694 7.34822 10.3527 7.76027 10.248C8.17231 10.1433 8.55786 9.95296 8.89194 9.68924C9.22603 9.42553 9.50121 9.09435 9.69966 8.71713C9.89812 8.33992 10.0154 7.92508 10.044 7.49949C10.0726 7.07389 10.0118 6.64701 9.86551 6.24649Z"
                        fill="url(#paint6_linear_802_289)"
                      />
                      <path
                        d="M9.36006 7.06679C9.36006 8.55005 8.16191 9.75248 6.68392 9.75248C5.89947 9.75248 5.19385 9.41375 4.70436 8.8741C4.73401 8.8968 4.76445 8.91867 4.7955 8.93957C5.0002 9.07735 5.23047 9.17234 5.47256 9.21886C5.71465 9.26537 5.96359 9.26246 6.20453 9.21031C6.44548 9.15815 6.67348 9.05781 6.87493 8.91528C7.07638 8.77275 7.24716 8.59095 7.37706 8.38073C7.50697 8.17051 7.59334 7.93618 7.63102 7.69172C7.6687 7.44727 7.65692 7.1977 7.59638 6.95791C7.58621 6.92387 7.57603 6.88983 7.56925 6.85579C7.56933 6.85466 7.56933 6.85352 7.56925 6.85239C7.55123 6.76965 7.54214 6.6852 7.54212 6.6005C7.54352 6.3312 7.63554 6.07027 7.80325 5.86003C7.97096 5.6498 8.20453 5.5026 8.46607 5.4423C8.57396 5.41742 8.68394 5.4079 8.79301 5.41347C9.1483 5.86929 9.36006 6.44322 9.36006 7.06679Z"
                        fill="url(#paint7_linear_802_289)"
                      />
                      <g filter="url(#filter0_d_802_289)">
                        <path
                          d="M9.47934 2.93023L9.75865 3.43154L10.26 3.71084L9.75865 3.99014L9.47934 4.49146L9.20004 3.99014L8.69873 3.71084L9.20004 3.43154L9.47934 2.93023Z"
                          fill="#F7F7F7"
                        />
                      </g>
                      <defs>
                        <filter
                          id="filter0_d_802_289"
                          x="4.69873"
                          y="2.93023"
                          width="9.56123"
                          height="9.56123"
                          filterUnits="userSpaceOnUse"
                          colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="4" />
                          <feGaussianBlur stdDeviation="2" />
                          <feComposite in2="hardAlpha" operator="out" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_802_289"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_802_289"
                            result="shape"
                          />
                        </filter>
                        <linearGradient
                          id="paint0_linear_802_289"
                          x1="3.85"
                          y1="1.1854"
                          x2="10.5"
                          y2="13.7854"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F0F0F0" />
                          <stop offset="1" stopColor="#EBEBED" />
                        </linearGradient>
                        <linearGradient
                          id="paint1_linear_802_289"
                          x1="11.2"
                          y1="13.0854"
                          x2="2.1"
                          y2="2.2354"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#2B3750" />
                          <stop offset="1" stopColor="#9AA4B9" />
                        </linearGradient>
                        <linearGradient
                          id="paint2_linear_802_289"
                          x1="2.80003"
                          y1="2.9354"
                          x2="10.5"
                          y2="12.7354"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#D6D8DF" />
                          <stop offset="1" stopColor="#DADCE3" />
                        </linearGradient>
                        <linearGradient
                          id="paint3_linear_802_289"
                          x1="11.2"
                          y1="11.6854"
                          x2="4.20003"
                          y2="6.0854"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#ABAFBF" />
                          <stop offset="1" stopColor="#B7BACC" />
                        </linearGradient>
                        <linearGradient
                          id="paint4_linear_802_289"
                          x1="4.9"
                          y1="3.2854"
                          x2="9.8"
                          y2="11.3354"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#9DA1B3" />
                          <stop offset="1" stopColor="#535A73" />
                        </linearGradient>
                        <linearGradient
                          id="paint5_linear_802_289"
                          x1="4.89999"
                          y1="4.68541"
                          x2="9.09999"
                          y2="10.2854"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FCFCFC" />
                          <stop offset="1" stopColor="#DDDFE6" />
                        </linearGradient>
                        <linearGradient
                          id="paint6_linear_802_289"
                          x1="4.89999"
                          y1="4.68541"
                          x2="9.09999"
                          y2="10.2854"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FCFCFC" />
                          <stop offset="1" stopColor="#DDDFE6" />
                        </linearGradient>
                        <linearGradient
                          id="paint7_linear_802_289"
                          x1="4.89999"
                          y1="4.68541"
                          x2="9.09999"
                          y2="10.2854"
                          gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FCFCFC" />
                          <stop offset="1" stopColor="#DDDFE6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : currencySymbol === 'cny' ? (
                    <Text
                      color="grayModern.600"
                      fontFamily="PingFang SC"
                      fontStyle="normal"
                      fontSize="14px"
                      fontWeight="400"
                      lineHeight="20px"
                      letterSpacing="0.25px">
                      ￥
                    </Text>
                  ) : (
                    <Text
                      color="grayModern.600"
                      fontFamily="PingFang SC"
                      fontStyle="normal"
                      fontSize="14px"
                      fontWeight="400"
                      lineHeight="20px"
                      letterSpacing="0.25px">
                      $
                    </Text>
                  )}
                </Flex>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="32px"
                  fontWeight="500"
                  lineHeight="40px">
                  {dashboardData?.used_amount ? Number(dashboardData.used_amount.toFixed(2)) : 0}
                </Text>
              </Flex>
            </Flex>
          </Flex>
          {/* chart 1 end */}

          <RequestDataChart data={dashboardData?.chart_data || []} />
        </Flex>
      </Flex>
    </Flex>
  )
}
