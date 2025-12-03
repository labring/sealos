import MyIcon from '@/components/Icon';
import { checkDomainICP } from '@/api/platform';
import { Box, Center } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';

// ICP备案状态组件
const ICPStatus = ({ customDomain, enabled }: { customDomain: string; enabled: boolean }) => {
  const { t } = useTranslation();
  const { data, isSuccess } = useQuery({
    queryKey: ['checkDomainICP', customDomain],
    queryFn: () => checkDomainICP({ domain: customDomain }),
    enabled: enabled,
    retry: false,
    staleTime: 1000 * 60 * 10 // 10min
  });

  if (!enabled || !isSuccess) return null;

  if (!data?.icpRegistered) {
    return (
      <Box ml={'8px'}>
        <Center
          fontSize={'12px'}
          fontWeight={400}
          bg={'#FEF2F2'}
          color={'#DC2626'}
          border={'1px solid #FECACA'}
          borderRadius={'full'}
          p={'2px 4px 2px 4px'}
          gap={'2px'}
          whiteSpace={'nowrap'}
        >
          {t('icp_reg_not_registered')}
        </Center>
      </Box>
    );
  }

  return null;
};

export default ICPStatus;
