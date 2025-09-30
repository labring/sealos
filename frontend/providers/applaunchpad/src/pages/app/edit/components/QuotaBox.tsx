import React, { useMemo } from 'react';
import { Box, Flex, useTheme, Progress, css, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { MyTooltip } from '@sealos/ui';

import { useUserStore } from '@/store/user';
import { resourcePropertyMap } from '@/constants/resource';

const sourceMap = {
  cpu: {
    color: '#33BABB'
  },
  memory: {
    color: '#36ADEF'
  },
  storage: {
    color: '#8172D8'
  },
  gpu: {
    color: '#89CD11'
  },
  nodeport: {
    color: '#FFA500'
  },
  traffic: {
    color: '#FF6B6B'
  }
};

const QuotaBox = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { userQuota, loadUserQuota } = useUserStore();
  useQuery(['getUserQuota'], loadUserQuota);

  const quotaList = useMemo(() => {
    if (!userQuota) return [];

    return userQuota
      .filter((item) => item.limit > 0)
      .map((item) => {
        const { limit, used, type } = item;
        const unit = resourcePropertyMap[type]?.unit;
        const scale = resourcePropertyMap[type]?.scale;
        const color = sourceMap[type]?.color;

        const tip = `${t('Total')}: ${(limit / scale).toFixed(2)} ${unit}
${t('common.Used')}: ${(used / scale).toFixed(2)} ${unit}
${t('common.Surplus')}: ${((limit - used) / scale).toFixed(2)} ${unit}`;

        return { ...item, tip, color };
      });
  }, [userQuota, t]);

  return userQuota.length === 0 ? null : (
    <Box borderRadius={'md'} border={theme.borders.base} bg={'#FFF'}>
      <Box
        py={3}
        px={4}
        borderBottom={theme.borders.base}
        color={'grayModern.900'}
        fontWeight={500}
      >
        <Text>{t('app.Resource Quota')}</Text>
      </Box>
      <Box py={3} px={4}>
        {quotaList.map((item) => (
          <MyTooltip key={item.type} label={item.tip} placement={'top-end'} lineHeight={1.7}>
            <Flex alignItems={'center'} _notFirst={{ mt: 3 }}>
              <Box fontSize={'base'} flex={'0 0 60px'}>
                {t(item.type)}
              </Box>
              <Progress
                flex={'1 0 0'}
                borderRadius={'sm'}
                size="sm"
                value={item.used}
                max={item.limit}
                css={css({
                  '& > div': {
                    bg: item.color
                  }
                })}
              />
            </Flex>
          </MyTooltip>
        ))}
      </Box>
    </Box>
  );
};

export default QuotaBox;
