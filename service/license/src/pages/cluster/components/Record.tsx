import { getClusterRecord } from '@/api/cluster';
import { ClusterIcon, EmptyIcon, RightIcon } from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { ClusterType } from '@/types';
import { Box, Center, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export type TClusterRecord = {
  changeClusterId: (id: string) => void;
  clusterId: string;
};

export default function ClusterRecord({ changeClusterId, clusterId }: TClusterRecord) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data } = useQuery(['getClusterRecord', page, pageSize], () =>
    getClusterRecord({
      page: page,
      pageSize: pageSize
    })
  );

  return (
    <Flex
      flex={1}
      flexDirection={'column'}
      alignItems={'center'}
      pt="64px"
      pb="40px"
      px="56px"
      position={'relative'}
    >
      <Text mb="20px" color={'#262A32'} fontSize={'28px'} fontWeight={600} alignSelf={'flex-start'}>
        {t('Cluster List')}
      </Text>
      {data?.records && data?.records?.length > 0 ? (
        <Box w="100%" flex={1} overflowY={'auto'} pb="20px" pr="12px">
          {data?.records.map((item, i) => (
            <Flex
              key={item?.clusterId}
              w="100%"
              minW={'350px'}
              h="72px"
              alignItems={'center'}
              justifyContent={'center'}
              border={clusterId === item.clusterId ? '1px solid #36ADEF' : '1px solid #EFF0F1'}
              borderRadius={'4px'}
              background={'#F8FAFB'}
              mt="16px"
              _hover={{ border: '1px solid #36ADEF' }}
              onClick={() => changeClusterId(item?.clusterId)}
            >
              <Box w="100%" pl="16px">
                <Flex alignItems={'center'}>
                  <ClusterIcon />
                  <Text color={'#485058'} fontSize={'16px'} fontWeight={500} mx="12px">
                    {t('Cluster')} {i + 1}
                  </Text>
                  <Center
                    bg={
                      item.type === ClusterType.Standard
                        ? 'rgba(0, 169, 166, 0.10)'
                        : 'rgba(33, 155, 244, 0.10)'
                    }
                    color={item.type === ClusterType.Standard ? '#00A9A6' : '#219BF4'}
                    borderRadius="4px"
                    p="3px 8px"
                    fontSize={'12px'}
                    fontWeight={500}
                  >
                    {t(item.type)}
                  </Center>
                </Flex>
              </Box>
              <Box h="100%" w="1px" border={'1px solid #EFF0F1'}></Box>
              <Flex justifyContent={'center'} alignItems={'center'} ml="auto" w="160px">
                <Text color={'#219BF4'} fontSize={'12px'} fontWeight={500}>
                  {t('Deploy')}
                </Text>
                <RightIcon w="12px" h={'12px'} />
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
        <Pagination totalItems={data?.total || 0} itemsPerPage={pageSize} onPageChange={() => {}} />
      </Flex>
    </Flex>
  );
}
