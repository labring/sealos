import React, { useMemo } from 'react';
import { Box, Flex, useTheme, Progress, css, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { MyTooltip } from '@sealos/ui';

import { useUserStore } from '@/store/user';

const sourceMap = {
  cpu: {
    color: '#33BABB',
    unit: 'Core'
  },
  memory: {
    color: '#36ADEF',
    unit: 'Gi'
  },
  storage: {
    color: '#8172D8',
    unit: 'GB'
  },
  gpu: {
    color: '#89CD11',
    unit: 'Card'
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
      .map((item) => ({
        ...item,
        tip: `${t('Total')}: ${`${item.limit} ${sourceMap[item.type]?.unit}`}
${t('common.Used')}: ${`${item.used} ${sourceMap[item.type]?.unit}`}
${t('common.Surplus')}: ${`${item.limit - item.used} ${sourceMap[item.type]?.unit}`}
`,
        color: sourceMap[item.type]?.color
      }))
      .filter((item) => item.limit > 0);
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
