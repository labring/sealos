import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Flex,
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Grid
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
            <MyIcon name="help" ml={'4px'} />
          </Flex>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverBody>
            <Flex flexDirection={'column'} gap={'8px'}>
              <Flex>
                <Box color="grayModern.900">{t('billing_resource')}: </Box>
                <Box color={'grayModern.600'} fontWeight={400}>
                  {t('CPU_with_Memory')}
                </Box>
              </Flex>
              <Box
                bg={'grayModern.100'}
                p={'4px 6px'}
                borderRadius={'4px'}
                color={'brightBlue.600'}
                fontWeight={400}
                lineHeight={'16px'}
              >
                {t('devbox_shutdown_notice1')}
              </Box>
              <Box
                gap={'4px'}
                borderRadius={'4px'}
                borderColor={'grayModern.200'}
                p={'12px'}
                bg={'yellow.50'}
              >
                <Box
                  display={'flex'}
                  alignItems={'center'}
                  gap={'4px'}
                  color={'grayModern.900'}
                  fontWeight={500}
                >
                  <MyIcon name="warning" color={'yellow.500'} w={'12px'} h={'12px'} />
                  {t('notice')}
                </Box>
                <Grid
                  gridTemplateColumns={'10px 1fr'}
                  gap={'4px'}
                  fontWeight={400}
                  lineHeight={'16px'}
                >
                  <Box color={'grayModern.500'}>1.</Box>
                  <Box color={'grayModern.500'}>
                    {t.rich('devbox_shutdown_notice2', {
                      black: (chunks) => (
                        <Box color={'grayModern.900'} display={'inline'}>
                          {chunks}
                        </Box>
                      )
                    })}
                  </Box>
                  <Box color={'grayModern.500'}>2.</Box>
                  <Box color={'grayModern.500'}>
                    {t.rich('devbox_shutdown_notice3', {
                      black: (chunks) => (
                        <Box color={'grayModern.900'} display={'inline'}>
                          {chunks}
                        </Box>
                      )
                    })}
                  </Box>
                </Grid>
              </Box>
            </Flex>
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
