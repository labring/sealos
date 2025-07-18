import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

import { useDateTimeStore } from '@/stores/date';
import { REFRESH_INTERVAL_OPTIONS } from '@/constants/date';

interface RefreshButtonProps {
  onRefresh: () => void;
}

export function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const t = useTranslations();
  const { refreshInterval, setRefreshInterval } = useDateTimeStore();
  const [isPaused, setIsPaused] = useState(false);
  const lastErrorTime = useRef<number>(0);
  const errorCount = useRef<number>(0);
  const PAUSE_THRESHOLD = 3;
  const PAUSE_DURATION = 10000;
  const ERROR_THROTTLE = 3000;

  const handleRefresh = useCallback(async () => {
    if (isPaused) return;

    try {
      await onRefresh();
      errorCount.current = 0;
    } catch (error) {
      errorCount.current += 1;
      const now = Date.now();

      if (now - lastErrorTime.current > ERROR_THROTTLE) {
        toast.error(t('refresh_failed'));
        lastErrorTime.current = now;
        console.error('Refresh failed:', error);
      }

      if (errorCount.current >= PAUSE_THRESHOLD) {
        setIsPaused(true);
        toast.warning(t('refresh_paused'));
        setTimeout(() => {
          setIsPaused(false);
          errorCount.current = 0;
        }, PAUSE_DURATION);
      }
    }
  }, [isPaused, onRefresh, t]);

  useEffect(() => {
    if (refreshInterval === 0 || isPaused) return;

    const timer = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, isPaused, handleRefresh]);

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        onClick={handleRefresh}
        disabled={isPaused}
        size="lg"
        className="rounded-lg rounded-r-none font-normal"
      >
        {isPaused ? t('paused') : t('refresh')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" variant="outline" className="rounded-lg rounded-l-none border-l-0">
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]" alignOffset={-30}>
          <div className="px-1 py-1.5 text-xs/4 font-medium text-zinc-500">
            {t('set_auto_refresh')}
          </div>
          {REFRESH_INTERVAL_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setRefreshInterval(option.value)}
              className="justify-between"
            >
              {option.value === 0 ? t('close') : `${option.label}`}
              {option.value === refreshInterval && <Check className="h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
