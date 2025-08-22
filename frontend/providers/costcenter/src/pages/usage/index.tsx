import receipt_icon from '@/assert/receipt_long_black.svg';
import { Cost } from '@/components/cost_overview/cost';
import NamespaceMenu from '@/components/menu/NamespaceMenu';
import RegionMenu from '@/components/menu/RegionMenu';
import { Refresh } from '@/components/Refresh';
import Quota from '@/components/valuation/quota';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { ApiResp, AppOverviewBilling } from '@/types';
import { Box, Flex, Heading, HStack, Img, Stack, Text, VStack } from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';

export default function Resource() {
  const { t } = useTranslation();
  const { setNamespace, getRegion, getAppName, getAppType, getNamespace, getCycle } =
    useBillingStore();
  const { startTime, endTime } = useOverviewStore();
  const regionUid = getRegion()?.uid || '';
  const [orderID, setOrderID] = useState('');
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalItem, setTotalItem] = useState(0);
  const [pageSize, setPageSize] = useState(4);
  const queryBody = {
    endTime,
    startTime,
    regionUid,
    appType: getAppType(),
    appName: getAppName(),
    namespace: getNamespace()?.[0] || '',
    page,
    pageSize
  };
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery({
    queryFn() {
      return request.post<
        any,
        ApiResp<{
          overviews: AppOverviewBilling[];
          total: number;
          totalPage: number;
        }>
      >('/api/billing/appOverview', queryBody);
    },
    onSuccess(data) {
      if (!data.data) {
        return;
      }
      const { total, totalPage } = data.data;
      if (totalPage === 0) {
        // search reset
        setTotalPage(1);
        setTotalItem(1);
      } else {
        setTotalItem(total);
        setTotalPage(totalPage);
      }
      if (totalPage < page) {
        setPage(1);
      }
    },
    keepPreviousData: true,
    queryKey: ['appOverviewBilling', queryBody, page, pageSize]
  });
  return (
    <Flex flexDirection="column" w="100%" h="100%" overflow={'auto'} gap={'8px'} p={'8px'}>
      <Box bg={'white'} px="24px" pt="20px" borderRadius={'8px'}>
        <Flex mr="24px" align={'center'} mb={'16px'}>
          <Img src={receipt_icon.src} boxSize={'20px'} mr={'10px'}></Img>
          <Heading size="sm" fontSize={'18px'} color={'grayModern.900'}>
            {t('SideBar.resource_analysis')}
          </Heading>
        </Flex>
        <HStack wrap={'wrap'}>
          <Flex align={'center'} mb="16px" mr="40px">
            <Text fontSize={'12px'} width={'80px'}>
              {t('region')}
            </Text>
            <RegionMenu isDisabled={isFetching} />
          </Flex>
          <Flex align={'center'} mb="16px" mr="40px">
            <Text fontSize={'12px'} width={'80px'}>
              {t('workspace')}
            </Text>
            <NamespaceMenu isDisabled={isFetching} />
          </Flex>
          <Refresh
            onRefresh={() => {
              queryClient.invalidateQueries(['costs'], { exact: false });
            }}
            ml={'auto'}
            mb="16px"
          />
        </HStack>
      </Box>
      <Flex flex={1} gap="8px" wrap={'wrap-reverse'}>
        <VStack gap="8px" bg={'white'} p="32px" flex={1} borderRadius={'8px'}>
          <Text alignSelf={'flex-start'}>{t('Source Quota')}</Text>
          <Quota />
        </VStack>
        <Stack bg={'white'} p="32px" flex={'1'} borderRadius={'8px'}>
          <Cost />
        </Stack>
      </Flex>
    </Flex>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}
