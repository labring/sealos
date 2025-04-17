'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Box, Flex, Progress, css, useTheme } from '@chakra-ui/react';

import { useUserStore } from '@/stores/user';
import MyTooltip from '@/components/MyTooltip';

const sourceMap = {
  cpu: {
    color: '#33BABB',
    unit: 'Core'
  },
  memory: {
    color: '#36ADEF',
    unit: 'Gi'
  },
  nodeports: {
    color: '#FFA500',
    unit: ''
  },
  gpu: {
    color: '#89CD11',
    unit: 'Card'
  }
};

const QuotaBox = ({ showBorder = true }: { showBorder?: boolean }) => {
  const theme = useTheme();
  const t = useTranslations();
  const { userQuota, loadUserQuota } = useUserStore();

  useQuery(['getUserQuota'], loadUserQuota);
  const quotaList = useMemo(() => {
    if (!userQuota) return [];

    return userQuota
      .filter((item) => item.limit > 0)
      .map((item) => {
        const { limit, used, type } = item;
        const unit = sourceMap[type]?.unit;
        const color = sourceMap[type]?.color;
        const tip = `${t('total')}: ${limit} ${unit}
${t('used')}: ${used.toFixed(2)} ${unit}
${t('remaining')}: ${(limit - used).toFixed(2)} ${unit}`;

        return { ...item, tip, color };
      });
  }, [userQuota, t]);

  return userQuota.length === 0 ? null : (
    <Box borderRadius={'md'} border={showBorder && theme.borders.base} bg={'#FFF'}>
      <Box
        py={3}
        px={'20px'}
        borderBottom={showBorder && theme.borders.base}
        color={'grayModern.900'}
        fontWeight={500}
      >
        {t('resource_quota')}
      </Box>
      <Flex flexDirection={'column'} gap={'14px'} py={'16px'} px={'20px'}>
        {quotaList.map((item) => (
          <MyTooltip key={item.type} label={item.tip} placement={'top-end'} lineHeight={1.7}>
            <Flex alignItems={'center'}>
              <Box textTransform={'capitalize'} w={'80px'}>
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
      </Flex>
    </Box>
  );
};

export default QuotaBox;
