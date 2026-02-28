'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { CircleHelp, HardDrive, PencilLine, Plus, Trash2 } from 'lucide-react';
import { customAlphabet } from 'nanoid';

import { Button } from '@sealos/shadcn-ui/button';
import { Separator } from '@sealos/shadcn-ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import NetworkStorageDrawer from '@/components/drawers/NetworkStorageDrawer';
import type { DevboxEditTypeV2 } from '@/types/devbox';

interface NetworkStorageProps {
  isEdit: boolean;
  originalVolumes?: DevboxEditTypeV2['volumes'];
}

const DEFAULT_GPU_VOLUME: NonNullable<DevboxEditTypeV2['volumes']>[number] = {
  path: '/home/devbox/project/model',
  size: 30
};
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
const createDefaultGpuVolume = (): NonNullable<DevboxEditTypeV2['volumes']>[number] => ({
  id: `gpu-model-${nanoid()}`,
  path: DEFAULT_GPU_VOLUME.path,
  size: DEFAULT_GPU_VOLUME.size
});

export default function NetworkStorage({ isEdit, originalVolumes }: NetworkStorageProps) {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const watchedVolumes = watch('volumes');
  const volumes = useMemo(() => watchedVolumes ?? [], [watchedVolumes]);
  const hasGpu = !!watch('gpu.type');

  const [isNetworkStorageDrawerOpen, setIsNetworkStorageDrawerOpen] = useState(false);
  const [editingStorageIndex, setEditingStorageIndex] = useState<number | null>(null);
  const previousHasGpuRef = useRef<boolean | null>(null);

  const hasDefaultGpuVolume = volumes.some(
    (item) => item.path?.toLowerCase() === DEFAULT_GPU_VOLUME.path.toLowerCase()
  );

  useEffect(() => {
    const previousHasGpu = previousHasGpuRef.current;

    if (previousHasGpu === null) {
      if (!isEdit && hasGpu && !hasDefaultGpuVolume) {
        setValue('volumes', [...volumes, createDefaultGpuVolume()]);
      }
      previousHasGpuRef.current = hasGpu;
      return;
    }

    if (!previousHasGpu && hasGpu && !hasDefaultGpuVolume) {
      setValue('volumes', [...volumes, createDefaultGpuVolume()]);
    }

    previousHasGpuRef.current = hasGpu;
  }, [hasDefaultGpuVolume, hasGpu, isEdit, setValue, volumes]);

  return (
    <div id="storage" className="flex flex-col gap-3">
      <Separator className="my-1" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-base font-medium">{t('storage')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center justify-center">
                <CircleHelp className="h-4 w-4 text-zinc-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-[250px] text-left text-xs ![text-wrap:wrap] whitespace-normal"
            >
              {t('network_storage_nfs_tooltip')}
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-2 bg-white px-4 py-2"
          onClick={() => {
            setEditingStorageIndex(null);
            setIsNetworkStorageDrawerOpen(true);
          }}
        >
          <Plus className="h-4 w-4 text-neutral-500" />
          <span className="text-sm/5 font-medium">{t('add')}</span>
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {volumes.map((storage, idx) => (
          <div
            key={storage.id || `${storage.path}-${idx}`}
            className="flex h-14 items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
          >
            <button
              type="button"
              className="flex flex-1 cursor-pointer items-center gap-3 text-left"
              onClick={() => {
                setEditingStorageIndex(idx);
                setIsNetworkStorageDrawerOpen(true);
              }}
            >
              <HardDrive className="h-6 w-6 text-zinc-400" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">{storage.path}</span>
                <span className="text-xs text-neutral-500">{storage.size} Gi</span>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 text-neutral-500 hover:bg-transparent hover:text-zinc-700"
                onClick={() => {
                  setEditingStorageIndex(idx);
                  setIsNetworkStorageDrawerOpen(true);
                }}
              >
                <PencilLine className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 text-neutral-500 hover:bg-transparent hover:text-red-600"
                onClick={() => {
                  setValue(
                    'volumes',
                    volumes.filter((_, i) => i !== idx)
                  );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isNetworkStorageDrawerOpen && (
        <NetworkStorageDrawer
          isEdit={isEdit}
          initialValue={editingStorageIndex !== null ? volumes[editingStorageIndex] : undefined}
          originalValue={
            isEdit && editingStorageIndex !== null && originalVolumes
              ? originalVolumes.find(
                  (v) =>
                    v.id === volumes[editingStorageIndex].id ||
                    v.path === volumes[editingStorageIndex].path
                )
              : undefined
          }
          existingPaths={volumes
            .filter((_, idx) => idx !== editingStorageIndex)
            .map((item) => item.path.toLowerCase())}
          onClose={() => {
            setIsNetworkStorageDrawerOpen(false);
            setEditingStorageIndex(null);
          }}
          onSuccess={(newStorage) => {
            if (editingStorageIndex !== null) {
              const updated = [...volumes];
              updated[editingStorageIndex] = newStorage;
              setValue('volumes', updated);
            } else {
              setValue('volumes', [...volumes, newStorage]);
            }
          }}
        />
      )}
    </div>
  );
}
