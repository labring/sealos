import React, { useMemo } from 'react';
import { Box, Flex, useTheme } from '@chakra-ui/react';
import { PodStatusEnum, podStatusMap } from '@/constants/db';
import type { V1ContainerStatus } from '@kubernetes/client-node';
import dayjs from 'dayjs';
import { MyTooltip } from '@sealos/ui';

const PodStatus = ({ containerStatuses }: { containerStatuses: V1ContainerStatus[] }) => {
  const theme = useTheme();
  const formatStatuses = useMemo(
    () =>
      containerStatuses.map((item) => {
        const obj = item.state || {};
        const status = (Object.keys(obj)[0] as `${PodStatusEnum}`) || PodStatusEnum.waiting;

        // @ts-ignore
        const reason = item.state?.[status]?.reason;
        // @ts-ignore
        const message = item.state?.[status]?.message;
        const startAt = item.state?.running?.startedAt;
        const label = `${item.name} ${status}${
          startAt ? `\nStartAt ${dayjs(startAt).format('YYYY/MM/DD HH:mm:ss')}` : ''
        }${reason ? `\nReason ${reason}` : ''}${message ? `\nmessage ${message}` : ''}`;

        return {
          ...podStatusMap[status],
          name: item.name,
          label
        };
      }),
    [containerStatuses]
  );

  return (
    <Flex>
      {formatStatuses.map((item, i) => (
        <MyTooltip key={item.name} textAlign={'center'} label={item.label}>
          <Box
            w={'12px'}
            h={'12px'}
            borderRadius={'2px'}
            _notLast={{ mr: 2 }}
            cursor={'pointer'}
            bg={item.bg}
            borderColor={item.bg}
          ></Box>
        </MyTooltip>
      ))}
    </Flex>
  );
};

export default PodStatus;
