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
      py={'6px'}
      px={'12px'}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      minW={'68px'}
      gap={'4px'}
    >
      <Box
        flexShrink={'0'}
        w={'6px'}
        h={'6px'}
        borderRadius={'10px'}
        backgroundColor={statusMap.dotColor}
      />
      <Box>{t(statusMap.label)}</Box>
    </Flex>
  );
};

export default AppStatusTag;
