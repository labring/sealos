import { useState } from 'react';
import { FileClock, LayoutDashboard, LineChart } from 'lucide-react';

import { cn } from '@/lib/utils';

const Sidebar = () => {
  const [currentTab, setCurrentTab] = useState('overview');

  const tabs = [
    {
      label: 'Overview',
      value: 'overview',
      icon: <LayoutDashboard className="h-6 w-6" />
    },
    {
      label: 'Monitor',
      value: 'monitor',
      icon: <LineChart className="h-6 w-6" />
    },
    {
      label: 'Logs',
      value: 'logs',
      icon: <FileClock className="h-6 w-6" />
    }
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
            onClick={() => setCurrentTab(tab.value)}
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
