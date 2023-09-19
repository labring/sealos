import request from '@/services/request';
import { ApiResp, LicenseRecord } from '@/types';
import download from '@/utils/downloadFIle';
import { formatMoney, getRemainingTime } from '@/utils/format';
import { Box, Flex, Image, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import Pagination from './Pagination';

export default function History() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data } = useQuery(['getLicenseActive', page, pageSize], () =>
    request.post<any, ApiResp<{ total: number; records: LicenseRecord[] }>>(
      '/api/license/getLicenseRecord',
      {
        page,
        pageSize
      }
    )
  );

  const downloadToken = (token: string) => {
    const result = Buffer.from(token, 'binary').toString('base64');
    download('token.txt', result);
  };

  return (
    <Flex
      flex={1}
      flexDirection={'column'}
      alignItems={'center'}
      pt="64px"
      pb="40px"
      pl="130px"
      position={'relative'}
    >
      <Text mb="20px" color={'#262A32'} fontSize={'28px'} fontWeight={600} alignSelf={'flex-start'}>
        {t('Purchase History')}
      </Text>
      {data?.data?.records && data?.data?.records?.length > 0 ? (
        <Box w="100%" flex={1} overflowY={'auto'} pb="20px" pr="12px">
          {data?.data?.records.map((item) => (
            <Flex
              key={item?._id ?? item.iat}
              w="100%"
              minW={'350px'}
              p="12px 0 12px 16px"
              border={'1px solid #EFF0F1'}
              borderRadius={'4px'}
              background={'#F8FAFB'}
              mt="16px"
            >
              <Box w="100%">
                <Flex alignItems={'center'} mb="8px">
                  <Image src={'/icons/license.svg'} w={'24px'} h={'24px'} alt="token"></Image>
                  <Text color={'#485058'} fontSize={'16px'} fontWeight={500} mx="10px">
                    License
                  </Text>
                  <Image
                    src={'/icons/shell_coin.svg'}
                    w={'14px'}
                    h={'14px'}
                    alt="token"
                    mr="6px"
                  ></Image>
                  <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500}>
                    {formatMoney(item.amount)}
                  </Text>
                </Flex>
                <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500}>
                  {t('Remaining Time')} {getRemainingTime(item.exp)}
                </Text>
              </Box>
              <Box h="100%" w="1px" border={'1px solid #EFF0F1'}></Box>
              <Flex justifyContent={'center'} alignItems={'center'} ml="auto" w="160px">
                <Image src={'/icons/token.svg'} w={'16px'} h={'16px'} alt="token"></Image>
                <Text color={'#485058'} fontSize={'12px'} fontWeight={500} px="8px">
                  Token
                </Text>
                <Image
                  cursor={'pointer'}
                  onClick={() => downloadToken(item.token)}
                  src={'/icons/download.svg'}
                  w={'20px'}
                  h={'20px'}
                  alt="download"
                ></Image>
              </Flex>
            </Flex>
          ))}
        </Box>
      ) : (
        <Flex
          w="100%"
          flex={1}
          overflowY={'auto'}
          pb="20px"
          pr="12px"
          justifyContent={'center'}
          alignItems={'center'}
          flexDirection={'column'}
        >
          <Image src="/icons/empty.svg" alt="empty" w="48px" h="48px"></Image>
          <Text mt="20px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
            {t('You have not purchased the License')}
          </Text>
        </Flex>
      )}

      <Flex ml="auto" mt={'auto'} pr="20px">
        <Pagination
          totalItems={data?.data?.total || 0}
          itemsPerPage={pageSize}
          onPageChange={() => {}}
        />
      </Flex>
    </Flex>
  );
}
