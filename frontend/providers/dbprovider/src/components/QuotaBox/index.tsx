import MyTooltip from '@/components/MyTooltip';
import { useUserStore } from '@/store/user';
import { Box, BoxProps, Flex, Progress, css } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

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

const QuotaBox = ({ titleStyle }: { titleStyle?: BoxProps }) => {
  const { t } = useTranslation();
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
        const tip = `${t('common.Total')}: ${limit} ${unit}
${t('common.Used')}: ${used.toFixed(2)} ${unit}
${t('common.Surplus')}: ${(limit - used).toFixed(2)} ${unit}`;

        return { ...item, tip, color };
      });
  }, [userQuota, t]);

  return userQuota.length === 0 ? null : (
    <Box>
      <Box py={3} px={4} color={'#485058'} fontWeight={500} fontSize={'14px'} {...titleStyle}>
        {t('app.Resource Quota')}
      </Box>
      <Box py={3} px={4}>
        {quotaList.map((item) => (
          <MyTooltip key={item.type} label={item.tip} placement={'top-end'} lineHeight={1.7}>
            <Flex alignItems={'center'} mt="16px">
              <Box flex={'0 0 60px'}>{t(item.type)}</Box>
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
