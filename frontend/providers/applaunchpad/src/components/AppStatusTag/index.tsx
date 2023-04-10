import React, { useMemo } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import type { AppStatusMapType } from '@/types/app';
import { appStatusMap } from '@/constants/app';

const AppStatusTag = ({ status, isPause }: { status: AppStatusMapType; isPause: boolean }) => {
  const statusMap = useMemo(() => (isPause ? appStatusMap.pause : status), [isPause, status]);
  return (
    <Flex
      color={statusMap.color}
      backgroundColor={statusMap.backgroundColor}
      py={2}
      px={3}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      w={'88px'}
    >
      <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={statusMap.dotColor}></Box>
      <Box ml={2} flex={1}>
        {statusMap.label}
      </Box>
    </Flex>
  );
};

export default AppStatusTag;
