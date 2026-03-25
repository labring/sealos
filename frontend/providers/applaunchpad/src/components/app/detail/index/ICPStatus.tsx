import { checkDomainICP } from '@/api/platform';
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
      <div className="ml-2">
        <div className="flex items-center justify-center text-xs font-normal bg-red-50 text-red-600 border-[0.5px] border-red-200 rounded-full px-2 py-0.5 gap-0.5 whitespace-nowrap">
          {t('icp_reg_not_registered')}
        </div>
      </div>
    );
  }

  return null;
};

export default ICPStatus;
