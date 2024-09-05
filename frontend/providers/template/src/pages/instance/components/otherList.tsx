import { listOtherByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import { ResourceListItemType } from '@/types/resource';
import { Box, Center, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';
import { OthersIcon } from '@/components/icons/Application';
import { EmptyBoxHeight } from './appList';

export default function OtherList({ instanceName }: { instanceName: string }) {
  const { t } = useTranslation();
  const { appendResource } = useResourceStore();
  const { session } = useSessionStore();

  const { data } = useQuery(
    ['listOtherByName', instanceName, session?.kubeconfig],
    () => listOtherByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        appendResource(data);
      }
    }
  );

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof ResourceListItemType;
      key: string;
      render?: (item: ResourceListItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: ResourceListItemType) => {
          return (
            <Box pl={4} color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.name}
            </Box>
          );
        }
      },
      {
        title: 'Kind',
        dataIndex: 'kind',
        key: 'kind'
      },
      {
        title: 'Component',
        dataIndex: 'label',
        key: 'label'
      },
      {
        title: 'Description',
        key: 'service ports',
        render: (item: ResourceListItemType) => {
          const text =
            item?.servicePorts && item.serviceType === 'NodePort'
              ? item?.servicePorts?.map((i) => `${i.port}:${i.nodePort}/${i.protocol}`).join(', ')
              : '';
          return <Text>{text}</Text>;
        }
      }
    ],
    []
  );

  return (
    <Box>
      <Flex alignItems={'center'} mt="48px">
        <OthersIcon />
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('others')}
        </Text>
      </Flex>
      <Box backgroundColor={'#F3F4F5'} mt="16px">
        {data && data?.length > 0 ? (
          <MyTable itemClass="appItem" columns={columns} data={data} />
        ) : (
          <Center background={'white'} h={EmptyBoxHeight} borderRadius={'6px'}>
            <Text fontSize={'12px'} color={'grayModern.500'}>
              {t('no_resource_type')}
            </Text>
          </Center>
        )}
      </Box>
    </Box>
  );
}
