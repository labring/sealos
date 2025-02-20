import React from 'react';
import { useTranslations } from 'next-intl';
import { Flex, Box } from '@chakra-ui/react';

import type { DevboxReleaseStatusMapType, DevboxStatusMapType } from '@/types/devbox';

const DevboxStatusTag = ({
  status,
  showBorder = false,
  thinMode = false,
  ...props
}: {
  status: DevboxStatusMapType | DevboxReleaseStatusMapType;
  showBorder?: boolean;
  size?: 'sm' | 'md' | 'lg';
  thinMode?: boolean;
  w?: string;
  h?: string;
}) => {
  const label = status?.label;
  const t = useTranslations();

  return (
    <Flex
      className="guide-status-tag"
      color={status.color}
      backgroundColor={thinMode ? 'transparent' : status.backgroundColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={status.color}
      py={1}
      px={thinMode ? 0 : 4}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      minW={'60px'}
      whiteSpace={'nowrap'}
      {...props}
    >
      <Box
        w={'6px'}
        h={'6px'}
        borderRadius={'10px'}
        backgroundColor={status.dotColor}
        display={thinMode ? 'none' : 'block'}
      ></Box>
      <Box ml={thinMode ? 0 : 2} flex={1}>
        {t(label)}
      </Box>
    </Flex>
  );
};

export default DevboxStatusTag;
