import { DownloadIcon, EmptyIcon, LicenseIcon, TokenIcon } from '@/components/Icon';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import RechargeComponent from './Recharge';
import { useQuery } from '@tanstack/react-query';
import { getLicenseByClusterId } from '@/api/license';
import { download } from '@/utils/downloadFIle';
import { json2License } from '@/utils/json2Yaml';
import CurrencySymbol from '@/components/CurrencySymbol';
import { getRemainingTime } from '@/utils/tools';
import useClusterDetail from '@/stores/cluster';

export default function License() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rechargeRef = useRef<{ onOpen: () => void }>();
  const { clusterDetail } = useClusterDetail();

  const { data } = useQuery(
    ['getLicenseByClusterId', page, pageSize, clusterDetail?.clusterId],
    () =>
      getLicenseByClusterId({
        page: page,
        pageSize: pageSize,
        clusterId: clusterDetail?.clusterId || ''
      }),
    {
      enabled: !!clusterDetail?.clusterId,
      onError(err) {
        console.log(err);
      }
    }
  );

  const downloadToken = (token: string) => {
    download('license.yaml', json2License({ token: token, type: 'Account' }));
  };

  return (
    <Box mt="32px">
      <Flex
        minH={'600px'}
        flexDirection={'column'}
        pt="34px"
        px="48px"
        bg="#FFF"
        borderRadius={'12px'}
      >
        <Flex alignItems={'center'} justifyContent={'space-between'}>
          <Text color={'#262A32'} fontSize={'20px'} fontWeight={600}>
            License 列表
          </Text>
          <Button
            w="140px"
            variant={'black'}
            onClick={() => {
              rechargeRef.current?.onOpen();
            }}
          >
            购买 License
          </Button>
        </Flex>

        {data?.records && data?.records?.length > 0 ? (
          <Box w="100%" flex={1} overflowY={'auto'}>
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
      </Flex>
      <RechargeComponent ref={rechargeRef} />
    </Box>
  );
}
