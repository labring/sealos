import React, { useMemo } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import type { AppStatusMapType } from '@/types/app';
import { appStatusMap } from '@/constants/app';
import { useTranslation } from 'next-i18next';

const AppStatusTag = ({
  status,
  isPause,
  showBorder = false
}: {
  status: AppStatusMapType;
  isPause: boolean;
  showBorder: boolean;
}) => {
  const { t } = useTranslation();
  const statusMap = useMemo(() => (isPause ? appStatusMap.pause : status), [isPause, status]);
  return (
    <Flex
      color={statusMap.color}
      backgroundColor={statusMap.backgroundColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={statusMap.color}
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
        {t(statusMap.label)}
      </Box>
    </Flex>
  );
};

export default AppStatusTag;
