'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { PencilLine, Plus, Trash2, FileText, HardDrive } from 'lucide-react';

import { Button } from '@sealos/shadcn-ui/button';
import { Separator } from '@sealos/shadcn-ui/separator';
import EnvVariablesDrawer from '@/components/drawers/EnvVariablesDrawer';
import ConfigMapDrawer from '@/components/drawers/ConfigMapDrawer';
import NetworkStorageDrawer from '@/components/drawers/NetworkStorageDrawer';
import type { DevboxEditTypeV2 } from '@/types/devbox';

export default function AdvancedConfig() {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();

  const envs = watch('envs') || [];
  const configMaps = watch('configMaps') || [];
  const volumes = watch('volumes') || [];

  const [isEnvDrawerOpen, setIsEnvDrawerOpen] = useState(false);
  const [isConfigMapDrawerOpen, setIsConfigMapDrawerOpen] = useState(false);
  const [editingConfigMapIndex, setEditingConfigMapIndex] = useState<number | null>(null);
  const [isNetworkStorageDrawerOpen, setIsNetworkStorageDrawerOpen] = useState(false);
  const [editingStorageIndex, setEditingStorageIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl/7 font-medium">{t('advanced_configurations')}</span>
        <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1.5">
          <span className="text-xs/4 font-medium text-zinc-600">{t('optional')}</span>
        </div>
      </div>

      {/* Environment Variables */}
      <div id="env" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{t('environment_variables')}</span>
          <Button
            variant="outline"
            className="h-9 gap-2 bg-white px-4 py-2"
            onClick={() => setIsEnvDrawerOpen(true)}
          >
            <PencilLine className="h-4 w-4 text-neutral-500" />
            <span className="text-sm/5 font-medium">{t('edit')}</span>
          </Button>
        </div>

        {/* Env Variables Table */}
        {envs.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {/* Table Header */}
            <div className="flex border-b border-zinc-200 bg-zinc-50">
              <div className="w-50 border-r border-zinc-200 px-3 py-2">
                <span className="text-sm font-semibold text-zinc-500">{t('key')}</span>
              </div>
              <div className="flex-1 px-3 py-2">
                <span className="text-sm font-semibold text-zinc-500">{t('value')}</span>
              </div>
            </div>

            {/* Table Body */}
            {envs.map((env, idx) => (
              <div
                key={idx}
                className={`flex border-b border-zinc-200 last:border-b-0 ${
                  idx % 2 === 1 ? 'bg-zinc-50' : ''
                }`}
              >
                <div className="w-50 border-r border-zinc-200 px-3 py-2">
                  <span className="truncate text-sm">{env.key}</span>
                </div>
                <div className="flex-1 px-3 py-2">
                  <span className="truncate text-sm">{env.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="my-1" />

      {/* ConfigMaps */}
      <div id="configmap" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{t('configmaps')}</span>
          <Button
            variant="outline"
            className="h-9 gap-2 bg-white px-4 py-2"
            onClick={() => {
              setEditingConfigMapIndex(null);
              setIsConfigMapDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4 text-neutral-500" />
            <span className="text-sm/5 font-medium">{t('add')}</span>
          </Button>
        </div>

        {/* ConfigMaps List */}
        <div className="flex flex-col gap-1">
          {configMaps.map((config, idx) => (
            <div
              key={idx}
              className="flex h-14 items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
            >
              <div
                className="flex flex-1 cursor-pointer items-center gap-3"
                onClick={() => {
                  setEditingConfigMapIndex(idx);
                  setIsConfigMapDrawerOpen(true);
                }}
              >
                <FileText className="h-6 w-6 text-zinc-400" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-900">{config.path}</span>
                  <span className="text-xs text-neutral-500">
                    {config.content.slice(0, 50)}
                    {config.content.length > 50 ? '...' : ''}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 text-neutral-500 hover:bg-transparent hover:text-red-600"
                onClick={() => {
                  setValue(
                    'configMaps',
                    configMaps.filter((_, i) => i !== idx)
                  );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-1" />

      {/* Network Storage */}
      <div id="storage" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{t('network_storage')}</span>
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

        {/* Storage List */}
        <div className="flex flex-col gap-1">
          {volumes.map((storage, idx) => (
            <div
              key={idx}
              className="flex h-14 items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
            >
              <div
                className="flex flex-1 cursor-pointer items-center gap-3"
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
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 text-neutral-500 hover:bg-transparent hover:text-red-600"
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
          ))}
        </div>
      </div>

      {isEnvDrawerOpen && (
        <EnvVariablesDrawer
          initialValue={envs}
          onClose={() => setIsEnvDrawerOpen(false)}
          onSuccess={(newEnvVars) => {
            setValue('envs', newEnvVars);
          }}
        />
      )}

      {isConfigMapDrawerOpen && (
        <ConfigMapDrawer
          initialValue={
            editingConfigMapIndex !== null ? configMaps[editingConfigMapIndex] : undefined
          }
          existingPaths={configMaps
            .filter((_, idx) => idx !== editingConfigMapIndex)
            .map((item) => item.path.toLowerCase())}
          onClose={() => {
            setIsConfigMapDrawerOpen(false);
            setEditingConfigMapIndex(null);
          }}
          onSuccess={(newConfigMap) => {
            if (editingConfigMapIndex !== null) {
              const updated = [...configMaps];
              updated[editingConfigMapIndex] = newConfigMap;
              setValue('configMaps', updated);
            } else {
              setValue('configMaps', [...configMaps, newConfigMap]);
            }
          }}
        />
      )}

      {isNetworkStorageDrawerOpen && (
        <NetworkStorageDrawer
          initialValue={editingStorageIndex !== null ? volumes[editingStorageIndex] : undefined}
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
