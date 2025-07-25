import { useTranslations } from 'next-intl';
import { FileClock, LayoutDashboard, LineChart } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TabValue = 'overview' | 'monitor' | 'logs';

interface SidebarProps {
  currentTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

const Sidebar = ({ currentTab, onTabChange }: SidebarProps) => {
  const t = useTranslations();

  const tabs = [
    {
      label: t('overview_tab'),
      value: 'overview' as TabValue,
      icon: <LayoutDashboard className="h-6 w-6" strokeWidth={1.33} />
    },
    {
      label: t('monitor_tab'),
      value: 'monitor' as TabValue,
      icon: <LineChart className="h-6 w-6" strokeWidth={1.33} />
    }
    // {
    //   label: t('logs_tab'),
    //   value: 'logs' as TabValue,
    //   icon: <FileClock className="h-6 w-6" strokeWidth={1.33} />
    // }
  ];

  return (
    <div className="flex flex-col rounded-xl border-[0.5px] border-zinc-200 bg-white p-2 shadow-xs">
      <div className="flex flex-col items-start gap-2">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            className={cn(
              'flex w-15 cursor-pointer flex-col items-center gap-1 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100',
              currentTab === tab.value && 'bg-zinc-100 text-zinc-900'
            )}
            onClick={() => onTabChange(tab.value)}
          >
            <span>{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
