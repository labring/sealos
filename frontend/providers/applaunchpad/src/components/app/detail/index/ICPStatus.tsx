import { checkDomainICP } from '@/api/platform';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// ICP备案状态组件
const ICPStatus = ({
  customDomain,
  enabled,
  onRegistrationStatusChange
}: {
  customDomain: string;
  enabled: boolean;
  onRegistrationStatusChange?: (registered: boolean | null) => void;
}) => {
  const { t } = useTranslation();
  const { data, isSuccess } = useQuery({
    queryKey: ['checkDomainICP', customDomain],
    queryFn: () => checkDomainICP({ domain: customDomain }),
    enabled: enabled,
    retry: false,
    staleTime: 1000 * 60 * 10 // 10min
  });

  useEffect(() => {
    if (!enabled || !isSuccess) {
      onRegistrationStatusChange?.(null);
      return;
    }

    onRegistrationStatusChange?.(Boolean(data?.icpRegistered));
  }, [data?.icpRegistered, enabled, isSuccess, onRegistrationStatusChange]);

  if (!enabled || !isSuccess) return null;

  if (!data?.icpRegistered) {
    return (
      <div className="w-fit relative top-[1px] h-5 flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium bg-red-50 text-red-600 rounded-full px-2 py-0.5 border-[0.5px] border-red-200">
        <div className="w-1.5 h-1.5 shrink-0 rounded-xs bg-red-500"></div>
        {t('icp_reg_not_registered')}
      </div>
    );
  }

  return null;
};

export default ICPStatus;
