import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { cn } from '@sealos/shadcn-ui';
import type { AppStatusMapType } from '@/types/app';
import { appStatusMap } from '@/constants/app';

interface AppStatusTagProps {
  status: AppStatusMapType;
  isPause: boolean;
  showBorder?: boolean;
  className?: string;
}

const AppStatusTag = ({ status, isPause, showBorder = false, className }: AppStatusTagProps) => {
  const { t } = useTranslation();
  const statusMap = useMemo(() => (isPause ? appStatusMap.pause : status), [isPause, status]);

  return (
    <div className="flex shrink-0 items-center">
      <div className={cn('flex items-center gap-2 text-sm font-medium', className)}>
        <div
          className="h-2 w-2 shrink-0 rounded-xs"
          style={{ backgroundColor: statusMap.dotColor }}
        />
        <span>{t(statusMap.label)}</span>
      </div>
    </div>
  );
};

export default AppStatusTag;
