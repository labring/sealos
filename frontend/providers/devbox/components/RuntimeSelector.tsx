'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Check, ChevronDown, PencilLine } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@sealos/shadcn-ui/popover';
import { Input } from '@sealos/shadcn-ui/input';
import { ScrollArea } from '@sealos/shadcn-ui/scroll-area';
import { cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import {
  listOfficialTemplateRepository,
  listPrivateTemplateRepository,
  listTemplate
} from '@/api/template';

interface RuntimeSelectorProps {
  selectedRuntime: {
    name: string;
    iconId: string;
    templateRepositoryUid: string;
    templateUid: string;
    version: string;
  } | null;
  onRuntimeSelect: (runtime: {
    name: string;
    iconId: string;
    templateRepositoryUid: string;
    templateUid: string;
    version: string;
  }) => void;
  onVersionChange?: (version: string, templateUid: string) => void;
  disabled?: boolean;
}

const CATEGORIES = [
  { key: 'official', label: 'Official' },
  { key: 'language', label: 'Language' },
  { key: 'framework', label: 'Framework' },
  { key: 'os', label: 'OS' },
  { key: 'mcp', label: 'MCP' },
  { key: 'unofficial', label: 'Unofficial' },
  { key: 'my_templates', label: 'My Templates' }
];

const RuntimeSelector = ({
  selectedRuntime,
  onRuntimeSelect,
  onVersionChange,
  disabled = false
}: RuntimeSelectorProps) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('official');

  const { data: officialTemplateRepositoryData } = useQuery(
    ['templateRepository', 'official'],
    listOfficialTemplateRepository,
    {
      enabled: open && selectedCategory !== 'my_templates'
    }
  );

  const { data: privateTemplateRepositoryData } = useQuery(
    ['templateRepository', 'private'],
    () => listPrivateTemplateRepository({ pageSize: 100 }),
    {
      enabled: open && selectedCategory === 'my_templates'
    }
  );

  const runtimesWithVersions = useMemo(() => {
    const officialList = officialTemplateRepositoryData?.templateRepositoryList || [];
    const privateList = privateTemplateRepositoryData?.templateRepositoryList || [];

    if (selectedCategory === 'my_templates') {
      return privateList.map((repo) => ({
        uid: repo.uid,
        name: repo.name,
        iconId: repo.iconId || '',
        description: repo.description,
        kind: undefined as any, // private template repository kind is not used
        tags: repo.templateRepositoryTags?.map((t) => t.tag) || []
      }));
    }

    return officialList.map((repo) => ({
      uid: repo.uid,
      name: repo.name,
      iconId: repo.iconId,
      description: repo.description,
      kind: repo.kind as any,
      tags: repo.templateRepositoryTags?.map((t) => t.tag) || []
    }));
  }, [officialTemplateRepositoryData, privateTemplateRepositoryData, selectedCategory]);

  const { data: selectedRuntimeVersions } = useQuery(
    ['template-versions', selectedRuntime?.templateRepositoryUid],
    async () => {
      if (!selectedRuntime?.templateRepositoryUid) return null;
      try {
        const data = await listTemplate(selectedRuntime.templateRepositoryUid);
        return data.templateList;
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!selectedRuntime?.templateRepositoryUid
    }
  );

  const filteredRuntimes = useMemo(() => {
    let filtered = runtimesWithVersions;

    if (selectedCategory === 'official') {
      filtered = filtered.filter((runtime) => {
        return runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT');
      });
    } else if (selectedCategory === 'language') {
      filtered = filtered.filter((runtime) => {
        return (
          runtime.kind === 'LANGUAGE' && runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT')
        );
      });
    } else if (selectedCategory === 'framework') {
      filtered = filtered.filter((runtime) => {
        return (
          runtime.kind === 'FRAMEWORK' &&
          runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT')
        );
      });
    } else if (selectedCategory === 'os') {
      filtered = filtered.filter((runtime) => {
        return runtime.kind === 'OS' && runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT');
      });
    } else if (selectedCategory === 'mcp') {
      filtered = filtered.filter((runtime) => {
        return (
          runtime.tags.some((tag) => tag.name === 'mcp') &&
          runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT')
        );
      });
    } else if (selectedCategory === 'unofficial') {
      filtered = filtered.filter((runtime) => {
        return !runtime.tags.some((tag) => tag.type === 'OFFICIAL_CONTENT');
      });
    }

    if (searchQuery) {
      filtered = filtered.filter((runtime) =>
        runtime.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [runtimesWithVersions, searchQuery, selectedCategory]);

  useEffect(() => {
    if (open && filteredRuntimes.length > 0) {
      filteredRuntimes.forEach((runtime) => {
        loadVersionsForRuntime(runtime.uid);
      });
    }
  }, [open, filteredRuntimes]);

  const [runtimeVersions, setRuntimeVersions] = useState<Record<string, any[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Record<string, boolean>>({});

  const loadVersionsForRuntime = async (runtimeUid: string) => {
    if (runtimeVersions[runtimeUid] || loadingVersions[runtimeUid]) {
      return runtimeVersions[runtimeUid] || [];
    }

    setLoadingVersions((prev) => ({ ...prev, [runtimeUid]: true }));
    try {
      const data = await listTemplate(runtimeUid);
      const templates = data.templateList || [];
      setRuntimeVersions((prev) => ({ ...prev, [runtimeUid]: templates }));
      return templates;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    } finally {
      setLoadingVersions((prev) => ({ ...prev, [runtimeUid]: false }));
    }
  };

  const handleRuntimeSelect = async (runtime: (typeof runtimesWithVersions)[0]) => {
    const versions = runtimeVersions[runtime.uid];

    if (versions && versions.length > 0) {
      const firstTemplate = versions[0];
      onRuntimeSelect({
        name: runtime.name,
        iconId: runtime.iconId,
        templateRepositoryUid: runtime.uid,
        templateUid: firstTemplate.uid,
        version: firstTemplate.name
      });
      setOpen(false);
      setSearchQuery('');
    }
  };

  const handleVersionChange = (runtimeUid: string, version: string) => {
    const versions = runtimeVersions[runtimeUid];
    if (!versions) return;

    const selectedTemplate = versions.find((t) => t.name === version);
    if (selectedTemplate && selectedRuntime) {
      onRuntimeSelect({
        ...selectedRuntime,
        templateUid: selectedTemplate.uid,
        version: selectedTemplate.name
      });
      setOpen(false);
      setSearchQuery('');
    }
  };

  const isSelected = (runtime: (typeof runtimesWithVersions)[0]) => {
    return selectedRuntime?.templateRepositoryUid === runtime.uid;
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      {!selectedRuntime ? (
        <PopoverTrigger asChild>
          <div
            className={cn(
              'flex h-14 cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => !disabled && setOpen(!open)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg border-[0.5px] border-dashed border-zinc-400" />
              <span className="text-sm text-zinc-500">{t('please_select_runtime')}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </div>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.4px] border-zinc-200 bg-white">
                <Image
                  src={`/images/runtime/${selectedRuntime.iconId}.svg`}
                  alt={selectedRuntime.name}
                  width={22}
                  height={22}
                />
              </div>
              <span className="text-base leading-none font-medium text-black">
                {selectedRuntime.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedRuntime.version}
                onValueChange={(value) =>
                  handleVersionChange(selectedRuntime.templateRepositoryUid, value)
                }
                disabled={disabled}
              >
                <SelectTrigger
                  className="h-10 min-w-[100px] gap-2 rounded-lg border-0 px-3 text-sm text-zinc-600 hover:bg-zinc-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedRuntimeVersions?.map((template) => (
                    <SelectItem key={template.uid} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-4 w-px bg-zinc-200" />

              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-10 gap-2 rounded-lg px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                <PencilLine className="h-4 w-4" />
                {t('change')}
              </Button>
            </div>
          </div>
        </PopoverTrigger>
      )}

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] rounded-xl border-zinc-200 bg-white p-0 shadow-lg"
        align="start"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex h-[400px] w-full flex-col">
          <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-100 p-2">
            <Input
              placeholder={t('search_runtime')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-zinc-200"
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="w-32 shrink-0 border-r border-zinc-200">
              <ScrollArea className="h-[330px]">
                <div className="flex flex-col p-2">
                  {CATEGORIES.map((category) => (
                    <div
                      key={category.key}
                      className={cn(
                        'cursor-pointer rounded-md px-2 py-2.5 text-sm text-zinc-900 transition-colors hover:bg-zinc-100',
                        selectedCategory === category.key && 'bg-zinc-100'
                      )}
                      onClick={() => setSelectedCategory(category.key)}
                    >
                      {category.label}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="min-w-0 flex-1">
              <ScrollArea className="h-[330px]">
                <div className="flex w-[270px] flex-col gap-2.5 p-2">
                  {filteredRuntimes.map((runtime) => {
                    const isRuntimeSelected = isSelected(runtime);
                    const versions = runtimeVersions[runtime.uid] || [];
                    const isLoadingVersions = loadingVersions[runtime.uid];

                    return (
                      <div
                        key={runtime.uid}
                        className="overflow-hidden rounded-xl border-[0.5px] border-zinc-200"
                      >
                        <div
                          className={cn(
                            'flex cursor-pointer items-center gap-2 bg-white px-4 py-3 transition-colors hover:bg-zinc-50'
                          )}
                          onClick={() => handleRuntimeSelect(runtime)}
                        >
                          <div className="flex w-[200px] flex-1 items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[0.4px] border-zinc-200">
                              <Image
                                src={`/images/runtime/${runtime.iconId}.svg`}
                                alt={runtime.name}
                                width={22}
                                height={22}
                              />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                              <p className="text-base leading-none font-medium text-black">
                                {runtime.name}
                              </p>
                              <p className="overflow-hidden text-sm leading-5 text-ellipsis whitespace-nowrap text-zinc-500">
                                {runtime.description || t('no_description')}
                              </p>
                            </div>
                          </div>
                          {isRuntimeSelected && (
                            <Check className="h-4 w-4 shrink-0 text-blue-600" />
                          )}
                        </div>

                        <div className="border-t border-zinc-100 bg-white px-4">
                          {isLoadingVersions ? (
                            <div className="flex h-7 items-center text-xs text-zinc-400">
                              {t('loading')}...
                            </div>
                          ) : versions.length > 0 ? (
                            <Select
                              value={
                                isRuntimeSelected && selectedRuntime
                                  ? selectedRuntime.version
                                  : versions[0]?.name
                              }
                              onValueChange={(value) => handleVersionChange(runtime.uid, value)}
                            >
                              <SelectTrigger className="h-7 w-full gap-2 border-0 bg-transparent px-0 text-xs text-zinc-500 hover:bg-transparent">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {versions.map((template) => (
                                  <SelectItem key={template.uid} value={template.name}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex h-7 items-center text-xs text-zinc-400">
                              {t('no_version_available')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredRuntimes.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-zinc-500">{t('no_runtime_found')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RuntimeSelector;
