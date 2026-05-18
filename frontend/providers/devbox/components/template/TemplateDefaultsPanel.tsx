import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, KeyRound, PencilLine, Trash2 } from 'lucide-react';

import { Button } from '@sealos/shadcn-ui/button';
import EnvVariablesDrawer from '@/components/drawers/EnvVariablesDrawer';
import ConfigMapDrawer from '@/components/drawers/ConfigMapDrawer';
import type { TemplateDefaults } from '@/utils/templateConfig';

interface TemplateDefaultsPanelProps {
  value: TemplateDefaults;
  onChange: (value: TemplateDefaults) => void;
  isPublic?: boolean;
}

export default function TemplateDefaultsPanel({
  value,
  onChange,
  isPublic = false
}: TemplateDefaultsPanelProps) {
  const t = useTranslations();
  const envs = value.envs || [];
  const configMaps = value.configMaps || [];
  const hasDefaults = envs.length > 0 || configMaps.length > 0;
  const [isEnvDrawerOpen, setIsEnvDrawerOpen] = useState(false);
  const [editingConfigMapIndex, setEditingConfigMapIndex] = useState<number | null>(null);

  if (!hasDefaults) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border-y border-zinc-100 py-5">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">{t('template_defaults')}</span>
        <span className="text-xs/5 text-zinc-500">
          {isPublic ? t('template_defaults_public_tip') : t('template_defaults_tip')}
        </span>
      </div>

      {envs.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">{t('environment_variables')}</span>
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-2 bg-white px-3"
              onClick={() => setIsEnvDrawerOpen(true)}
            >
              <PencilLine className="h-4 w-4 text-neutral-500" />
              <span className="text-sm">{t('edit')}</span>
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {envs.map((env, idx) => (
              <div
                key={`${env.key}-${idx}`}
                className="flex min-h-10 items-center border-b border-zinc-200 last:border-b-0"
              >
                <div className="flex w-[180px] items-center gap-2 border-r border-zinc-200 px-3 py-2">
                  <KeyRound className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate text-sm text-zinc-900">{env.key}</span>
                </div>
                <div className="min-w-0 flex-1 px-3 py-2">
                  <span className="block truncate text-sm text-zinc-600">{env.value}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mr-2 h-8 w-8 text-neutral-500 hover:bg-transparent hover:text-red-600"
                  onClick={() =>
                    onChange({
                      ...value,
                      envs: envs.filter((_, itemIndex) => itemIndex !== idx)
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {configMaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">{t('configmaps')}</span>
          <div className="flex flex-col gap-2">
            {configMaps.map((configMap, idx) => (
              <div
                key={`${configMap.path}-${idx}`}
                className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setEditingConfigMapIndex(idx)}
                >
                  <FileText className="h-5 w-5 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {configMap.path}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {configMap.content || t('empty_content')}
                    </span>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-500 hover:bg-transparent hover:text-red-600"
                  onClick={() =>
                    onChange({
                      ...value,
                      configMaps: configMaps.filter((_, itemIndex) => itemIndex !== idx)
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEnvDrawerOpen && (
        <EnvVariablesDrawer
          initialValue={envs}
          onClose={() => setIsEnvDrawerOpen(false)}
          onSuccess={(newEnvVars) => onChange({ ...value, envs: newEnvVars })}
        />
      )}

      {editingConfigMapIndex !== null && (
        <ConfigMapDrawer
          initialValue={configMaps[editingConfigMapIndex]}
          existingPaths={configMaps
            .filter((_, idx) => idx !== editingConfigMapIndex)
            .map((item) => item.path.toLowerCase())}
          onClose={() => setEditingConfigMapIndex(null)}
          onSuccess={(newConfigMap) => {
            const nextConfigMaps = [...configMaps];
            nextConfigMaps[editingConfigMapIndex] = newConfigMap;
            onChange({ ...value, configMaps: nextConfigMaps });
          }}
        />
      )}
    </div>
  );
}
