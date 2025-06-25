'use client';

import {
  ArrowBigUpDash,
  Ellipsis,
  IterationCw,
  Pause,
  PencilLine,
  Play,
  SquareTerminal,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { DevboxListItemTypeV2 } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import { useControlDevbox } from '../hooks/useControlDevbox';
import { generateMockMonitorData } from '@/constants/mock';

import IDEButton from '@/components/IDEButton';
import MonitorChart from '@/components/MonitorChart';
import DevboxStatusTag from '@/components/StatusTag';
import ReleaseModal from '@/components/modals/ReleaseModal';
import ShutdownModal from '@/components/modals/ShutdownModal';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const DelModal = dynamic(() => import('@/components/modals/DelModal'));

interface TableColumn {
  key: string;
  width?: number;
  render: (item: DevboxListItemTypeV2) => React.ReactNode;
}

const DevboxList = ({
  devboxList = [],
  refetchDevboxList
}: {
  devboxList: DevboxListItemTypeV2[];
  refetchDevboxList: () => void;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { handleRestartDevbox, handleStartDevbox, handleGoToTerminal } =
    useControlDevbox(refetchDevboxList);

  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [onOpenShutdown, setOnOpenShutdown] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxListItemTypeV2 | null>(null);
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemTypeV2 | null>(
    null
  );

  const handleOpenRelease = useCallback((devbox: DevboxListItemTypeV2) => {
    setCurrentDevboxListItem(devbox);
    setOnOpenRelease(true);
  }, []);

  const TABLE_COLUMNS: TableColumn[] = [
    {
      key: 'name',
      width: 250,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
            <Image
              width={21}
              height={21}
              alt={item.id}
              src={`/images/runtime/${item.template.templateRepository.iconId}.svg`}
            />
          </div>
          <span className="text-sm/1 font-medium">{item.name}</span>
        </div>
      )
    },
    {
      key: 'status',
      width: 140,
      render: (item) => (
        <DevboxStatusTag
          status={item.status}
          isShutdown={item.status.value === DevboxStatusEnum.Shutdown}
        />
      )
    },
    {
      key: 'cpu',
      width: 256,
      render: (item) => (
        <MonitorChart type="blue" data={item.usedCpu || generateMockMonitorData(item.name)} />
      )
    },
    {
      key: 'memory',
      width: 256,
      render: (item) => (
        <MonitorChart type="green" data={item.usedMemory || generateMockMonitorData(item.name)} />
      )
    },
    {
      key: 'create_time',
      width: 150,
      render: (item) => <span className="text-sm text-zinc-600">{item.createTime}</span>
    },
    {
      key: 'action',
      width: 270,
      render: (item) => (
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <IDEButton
            devboxName={item.name}
            sshPort={item.sshPort}
            status={item.status}
            runtimeType={item.template.templateRepository.iconId as string}
          />
          <Button variant="secondary" onClick={() => router.push(`/devbox/detail/${item.name}`)}>
            {t('detail')}
          </Button>
          {/* control dropdown */}
          {/* TODO: there need a new feature: pending cannot do any control action */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Ellipsis className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="h-9" onClick={() => handleOpenRelease(item)}>
                <ArrowBigUpDash className="h-4 w-4 text-neutral-500" />
                {t('release')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-9"
                disabled={item.status.value !== 'Running'}
                onClick={() => handleGoToTerminal(item)}
              >
                <SquareTerminal className="h-4 w-4 text-neutral-500" />
                {t('terminal')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                onClick={() => router.push(`/devbox/create?name=${item.name}`)}
              >
                <PencilLine className="h-4 w-4 text-neutral-500" />
                {t('update')}
              </DropdownMenuItem>
              {(item.status.value === 'Stopped' || item.status.value === 'Shutdown') && (
                <DropdownMenuItem
                  className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                  onClick={() => handleStartDevbox(item)}
                >
                  <Play className="h-4 w-4 text-neutral-500" />
                  {t('start')}
                </DropdownMenuItem>
              )}
              {item.status.value !== 'Stopped' && item.status.value !== 'Shutdown' && (
                <DropdownMenuItem
                  className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                  onClick={() => handleRestartDevbox(item)}
                >
                  <IterationCw className="h-4 w-4 text-neutral-500" />
                  {t('restart')}
                </DropdownMenuItem>
              )}
              {item.status.value === 'Running' && (
                <DropdownMenuItem
                  className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                  onClick={() => {
                    setOnOpenShutdown(true);
                    setCurrentDevboxListItem(item);
                  }}
                >
                  <Pause className="h-4 w-4 text-neutral-500" />
                  {t('shutdown')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                onClick={() => setDelDevbox(item)}
              >
                <Trash2 className="h-4 w-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return (
    <>
      {/* table */}
      <div className="flex w-full flex-col gap-3">
        {/* table header */}
        <div className="flex h-10 items-center rounded-lg border-[0.5px] bg-white px-6 py-1">
          {TABLE_COLUMNS.map((item) => (
            <div
              key={item.key}
              style={{ width: item.width ? `${item.width}px` : 'auto' }}
              className={cn('flex flex-shrink-0 gap-0.5', !item.width && 'flex-1')}
            >
              <span className="text-sm text-zinc-500">{t(item.key)}</span>
            </div>
          ))}
        </div>
        {/* table body */}
        {devboxList.map((item) => (
          <div
            key={item.id}
            className="flex h-18 items-center rounded-xl border-[0.5px] bg-white px-6 transition-colors"
            data-id={item.id}
          >
            {TABLE_COLUMNS.map((header) => (
              <div
                key={header.key}
                style={{ width: header.width ? `${header.width}px` : 'auto' }}
                className={cn('flex-shrink-0', !header.width && 'flex-1')}
              >
                {header.render(item)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {!!delDevbox && (
        <DelModal
          devbox={delDevbox!}
          onClose={() => setDelDevbox(null)}
          onSuccess={refetchDevboxList}
          refetchDevboxList={refetchDevboxList}
        />
      )}
      {!!onOpenRelease && !!currentDevboxListItem && (
        <ReleaseModal
          onSuccess={() => {
            router.push(`/devbox/detail/${currentDevboxListItem!.name}`);
          }}
          onClose={() => {
            setOnOpenRelease(false);
            setCurrentDevboxListItem(null);
          }}
          devbox={currentDevboxListItem!}
        />
      )}
      {onOpenShutdown && currentDevboxListItem && (
        <ShutdownModal
          onSuccess={() => {
            refetchDevboxList();
            setOnOpenShutdown(false);
          }}
          onClose={() => {
            setOnOpenShutdown(false);
          }}
          devbox={currentDevboxListItem!}
        />
      )}
    </>
  );
};

export default DevboxList;
