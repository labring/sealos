import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { LOG_ENABLED } from '@/store/static';
import { LayoutDashboard, LineChart, FileClock, Cog } from 'lucide-react';

export const ROUTES = {
  OVERVIEW: '/app/detail',
  MONITOR: '/app/detail/monitor',
  ADVANCED: '/app/detail/advanced',
  LOGS: '/app/detail/logs'
} as const;

export default function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();

  const siderbarMap = [
    {
      label: t('overview'),
      icon: (
        <LayoutDashboard
          className={`w-6 h-6 stroke-[1.5] ${
            router.pathname === ROUTES.OVERVIEW ? 'text-zinc-900' : 'text-zinc-500'
          }`}
        />
      ),
      path: ROUTES.OVERVIEW
    },
    {
      label: t('monitor'),
      icon: (
        <LineChart
          className={`w-6 h-6 stroke-[1.5] ${
            router.pathname === ROUTES.MONITOR ? 'text-zinc-900' : 'text-zinc-500'
          }`}
        />
      ),
      path: ROUTES.MONITOR
    },
    ...(LOG_ENABLED
      ? [
          {
            label: t('Log'),
            icon: (
              <FileClock
                className={`w-6 h-6 stroke-[1.5] ${
                  router.pathname === ROUTES.LOGS ? 'text-zinc-900' : 'text-zinc-500'
                }`}
              />
            ),
            path: ROUTES.LOGS
          }
        ]
      : []),
    {
      label: t('Advanced Configuration'),
      icon: (
        <Cog
          className={`w-6 h-6 stroke-[1.5] ${
            router.pathname === ROUTES.ADVANCED ? 'text-zinc-900' : 'text-zinc-500'
          }`}
        />
      ),
      path: ROUTES.ADVANCED
    }
  ];

  return (
    <div className="w-[76px] py-2 px-2 shrink-0 flex flex-col gap-2 rounded-xl bg-white border-[0.5px] border-zinc-200 font-normal">
      {siderbarMap.map((item) => (
        <div
          key={item.path}
          className={`flex flex-col items-center justify-center gap-1 h-[60px] rounded-lg cursor-pointer transition-colors ${
            router.pathname === item.path
              ? 'bg-zinc-100 text-zinc-900'
              : 'bg-transparent text-zinc-900 hover:bg-zinc-50'
          }`}
          onClick={() => {
            console.log(router.query);
            router.push({
              pathname: item.path,
              query: { ...router.query }
            });
          }}
        >
          {item.icon}
          <span
            className={`text-xs ${
              router.pathname === item.path ? 'text-zinc-900' : 'text-zinc-500'
            }`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
