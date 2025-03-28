import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Flex,
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody
} from '@chakra-ui/react';

import type { DevboxReleaseStatusMapType, DevboxStatusMapType } from '@/types/devbox';
import MyIcon from './Icon';

const DevboxStatusTag = ({
  status,
  showBorder = false,
  thinMode = false,
  isShutdown = false,
  ...props
}: {
  status: DevboxStatusMapType | DevboxReleaseStatusMapType;
  showBorder?: boolean;
  size?: 'sm' | 'md' | 'lg';
  thinMode?: boolean;
  w?: string;
  h?: string;
  isShutdown?: boolean;
}) => {
  const label = status?.label;
  const t = useTranslations();

  if (isShutdown) {
    return (
      <Popover trigger="hover" placement="bottom-start">
        <PopoverTrigger>
          <Flex
            cursor={'pointer'}
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
            <MyIcon name="help" />
          </Flex>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverBody>
            <Box>{t('devbox_shutdown_notice1')}</Box>
            <Box>
              <Box>{t('notice')}</Box>
              <Box>{t('devbox_shutdown_notice2')}</Box>
              <Box>{t('devbox_shutdown_notice3')}</Box>
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  }

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
