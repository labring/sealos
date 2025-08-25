import { getLicenseByClusterId } from '@/api/license';
import CurrencySymbol from '@/components/CurrencySymbol';
import { DownloadIcon, EmptyIcon, LicenseIcon, TokenIcon } from '@/components/Icon';
import RechargeComponent from '@/components/recharge';
import useClusterDetail from '@/stores/cluster';
import { download } from '@/utils/downloadFIle';
import { json2License } from '@/utils/json2Yaml';
import { getRemainingTime } from '@/utils/tools';
import { Box, Button, Flex, Text, useToast } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';

export default function License() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rechargeRef = useRef<{ onOpen: () => void }>();
  const { clusterDetail } = useClusterDetail();
  const toast = useToast();

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
    download('license.yaml', json2License({ token: token, type: 'Cluster' }));
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
              if (!clusterDetail?.cpu && !clusterDetail?.memory) {
                return toast({
                  title: '注意：旧版本不再支持续费，请获取最新版本的集群',
                  description:
                    '如果您需要续费，请先升级到最新版本的集群。遇到其他问题，如需帮助，可以通过工单及时联系我们。',
                  position: 'top',
                  isClosable: true,
                  status: 'warning'
                });
              }
              rechargeRef.current?.onOpen();
            }}
          >
            购买 License
          </Button>
        </Flex>

        {data?.records && data?.records?.length > 0 ? (
          <Box w="100%" flex={1} overflowY={'auto'} mb={'16px'}>
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
                  <Flex alignItems={'center'}>
                    <LicenseIcon />
                    <Text color={'#485058'} fontSize={'16px'} fontWeight={500} mx="10px">
                      License
                    </Text>
                    <CurrencySymbol w="14px" h="14px" type={'shellCoin'} />
                    <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500}>
                      {item?.amount}
                    </Text>
                  </Flex>
                  {item?.cpu && (
                    <Flex
                      mt={'8px'}
                      color={'#5A646E'}
                      fontSize={'12px'}
                      fontWeight={500}
                      alignItems={'center'}
                      gap={'16px'}
                    >
                      <Text>CPU: {item?.cpu} Core</Text>
                      <Text>内存: {item?.memory} G</Text>
                      <Text>有效时间: {getRemainingTime(item.exp)}</Text>
                    </Flex>
                  )}
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
      <RechargeComponent ref={rechargeRef} isLicensePay={true} key={'license'} />
    </Box>
  );
}
