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

  return (
    <Flex alignItems={'center'} gap={'4px'}>
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
      {isShutdown && (
        <Popover trigger="hover" placement="bottom-start">
          <PopoverTrigger>
            <Flex alignItems={'center'} cursor={'pointer'} fontSize={'12px'} fontWeight={500}>
              <Box color={'teal.400'}>{t('saving')}</Box>
              <MyIcon name="help" ml={'2px'} color={'teal.400'} transform={'scale(0.8)'} />
            </Flex>
          </PopoverTrigger>
          <PopoverContent w={'346px'}>
            <PopoverArrow />
            <PopoverBody>
              <Flex flexDirection={'column'} gap={'8px'} p={'6px'}>
                <Box
                  bg={'grayModern.100'}
                  p={'4px 6px'}
                  borderRadius={'4px'}
                  color={'teal.400'}
                  fontWeight={500}
                  lineHeight={'16px'}
                  textAlign={'center'}
                >
                  {t('devbox_shutdown_notice1')}
                </Box>
                <Box borderRadius={'4px'} fontWeight={400}>
                  <Box color={'grayModern.500'}>
                    {t.rich('devbox_shutdown_notice2', {
                      black: (chunks) => (
                        <Box color={'grayModern.900'} display={'inline'}>
                          {chunks}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      )}
    </Flex>
  );
};

export default DevboxStatusTag;
