import { getLicenseRecord } from '@/api/license';
import CurrencySymbol from '@/components/CurrencySymbol';
import { DownloadIcon, EmptyIcon, LicenseIcon, TokenIcon } from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { download } from '@/utils/downloadFIle';
import { json2License } from '@/utils/json2Yaml';
import { getRemainingTime } from '@/utils/tools';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export default function History() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data } = useQuery(['getLicenseActive', page, pageSize], () =>
    getLicenseRecord({
      page: page,
      pageSize: pageSize
    })
  );

  const downloadToken = (token: string) => {
    download('license.yaml', json2License({ token: token, type: 'Cluster' }));
  };

  return (
    <Flex
      flex={1}
      flexDirection={'column'}
      alignItems={'center'}
      pt="64px"
      pb="40px"
      px="130px"
      position={'relative'}
    >
      <Text mb="20px" color={'#262A32'} fontSize={'28px'} fontWeight={600} alignSelf={'flex-start'}>
        {t('Purchase History')}
      </Text>
      {data?.records && data?.records?.length > 0 ? (
        <Box w="100%" flex={1} overflowY={'auto'} pb="20px" pr="12px">
          {data?.records.map((item) => (
            <Flex
              key={item?._id?.toString() ?? item.iat}
              w="100%"
              minW={'350px'}
              p="12px 12px 12px 16px"
              border={'1px solid #EFF0F1'}
              borderRadius={'4px'}
              background={'#F8FAFB'}
              mt="16px"
            >
              <Box w="100%">
                <Flex alignItems={'center'} mb="8px">
                  <LicenseIcon />
                  <Text color={'#485058'} fontSize={'16px'} fontWeight={500} mx="10px">
                    License
                  </Text>
                  <CurrencySymbol w="14px" h="14px" type={'shellCoin'} />
                  <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500}>
                    {item.amount}
                  </Text>
                </Flex>
                <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500}>
                  {t('Remaining Time')} {getRemainingTime(item.exp)}
                </Text>
              </Box>
              <Box h="100%" w="1px" border={'1px solid #EFF0F1'}></Box>
              <Flex justifyContent={'center'} alignItems={'center'} ml="auto" w="160px">
                <TokenIcon />
                <Text color={'#485058'} fontSize={'12px'} fontWeight={500} px="8px">
                  License
                </Text>
                <Flex cursor={'pointer'} onClick={() => downloadToken(item.token)}>
                  <DownloadIcon />
                </Flex>
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
          <EmptyIcon />
          <Text mt="20px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
            {t('You have not purchased the License')}
          </Text>
        </Flex>
      )}
      <Flex ml="auto" mt={'auto'} pr="20px">
        <Pagination
          totalItems={data?.total || 0}
          itemsPerPage={pageSize}
          onPageChange={(page) => setPage(page)}
        />
      </Flex>
    </Flex>
  );
}
