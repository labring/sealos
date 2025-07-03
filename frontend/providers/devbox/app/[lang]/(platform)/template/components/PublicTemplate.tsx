import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { Tag, TagType } from '@/prisma/generated/client';
import { useTagSelectorStore } from '@/stores/tagSelector';
import { listTag, listTemplateRepository as listTemplateRepositoryApi } from '@/api/template';

import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import TemplateCard from './TemplateCard';
import SwitchPage from '@/components/SwitchPage';

const PublicTemplate = ({ search }: { search: string }) => {
  const { selectedTagList, getSelectedTagList, resetTags } = useTagSelectorStore();
  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });

  let tags = (tagsQuery.data?.tagList || []).sort((a, b) =>
    a.name === 'official' ? -1 : b.name === 'official' ? 1 : 0
  );

  let tagListCollection = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    },
    {
      [TagType.OFFICIAL_CONTENT]: [],
      [TagType.USE_CASE]: [],
      [TagType.PROGRAMMING_LANGUAGE]: []
    } as Record<TagType, Tag[]>
  );

  const [pageQueryBody, setPageQueryBody] = useState({
    page: 1,
    pageSize: 30,
    totalItems: 0,
    totalPage: 0
  });

  // reset query when search changes
  useEffect(() => {
    if (!search) return;
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [search]);

  // reset query when selected tags change
  useEffect(() => {
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [selectedTagList]);

  // cleanup selected tags when component unmounts
  useEffect(() => {
    return () => {
      resetTags();
    };
  }, [resetTags]);

  const queryBody = {
    page: pageQueryBody.page,
    pageSize: pageQueryBody.pageSize,
    search,
    tags: getSelectedTagList()
  };

  const listTemplateRepository = useQuery(
    ['template-repository-list', 'template-repository-public', queryBody],
    () => {
      return listTemplateRepositoryApi(
        {
          page: queryBody.page,
          pageSize: queryBody.pageSize
        },
        queryBody.tags,
        queryBody.search
      );
    }
  );

  useEffect(() => {
    if (listTemplateRepository.isSuccess && listTemplateRepository.data) {
      const data = listTemplateRepository.data.page;
      setPageQueryBody((prev) => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }));
    }
  }, [listTemplateRepository.data, listTemplateRepository.isSuccess]);

  const templateRepositoryList = listTemplateRepository.data?.templateRepositoryList || [];
  const t = useTranslations();

  return (
    <div className="flex h-full gap-3">
      {/* left sidebar */}
      <div className="flex w-50 flex-shrink-0 flex-col items-start gap-1">
        <span className="truncate px-2 py-1.5 text-sm text-zinc-900">{t('tags')}</span>
        <ScrollArea className="flex h-[calc(100vh-200px)] w-full flex-col gap-1 pr-2">
          <TagItem tag={tagListCollection[TagType.OFFICIAL_CONTENT][0]} />
          <TagList tags={tagListCollection[TagType.USE_CASE]} title={t('use_case')} />
          <TagList
            tags={tagListCollection[TagType.PROGRAMMING_LANGUAGE]}
            title={t('programming_language')}
          />
        </ScrollArea>
      </div>

      {/* right content */}
      <div className="flex flex-1 flex-col">
        <span className="mb-4 text-lg font-medium text-gray-600">{t('all_templates')}</span>
        <div className="relative h-[400px] flex-1">
          <ScrollArea className="absolute inset-0 pr-1">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(210px,300px,440px),1fr))] gap-5">
              {templateRepositoryList.map((tr) => (
                <TemplateCard
                  key={tr.uid}
                  iconId={tr.iconId || ''}
                  templateRepositoryName={tr.name}
                  templateRepositoryDescription={tr.description}
                  templateRepositoryUid={tr.uid}
                  tags={tr.templateRepositoryTags.map((t) => t.tag)}
                  isPublic
                />
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex">
          <SwitchPage
            className="mt-2 ml-auto"
            pageSize={pageQueryBody.pageSize}
            totalPage={pageQueryBody.totalPage}
            totalItem={pageQueryBody.totalItems}
            currentPage={pageQueryBody.page}
            setCurrentPage={(currentPage) => {
              setPageQueryBody((page) => ({
                ...page,
                page: currentPage
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
};

const TagItem = ({ tag }: { tag: Tag }) => {
  const { selectedTagList, setSelectedTag } = useTagSelectorStore();
  const locale = useLocale();

  if (!tag) return null;

  return (
    <div
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1',
        selectedTagList.has(tag.uid) && 'bg-[rgba(0,0,0,0.04)]'
      )}
    >
      <Checkbox
        id={tag.uid}
        className="border-zinc-900"
        checked={selectedTagList.has(tag.uid)}
        onCheckedChange={(checked) => {
          setSelectedTag(tag.uid, checked as boolean);
        }}
      />
      <Label htmlFor={tag.uid} className="cursor-point w-full text-sm text-zinc-900">
        {tag[locale === 'zh' ? 'zhName' : 'enName'] || tag.name}
      </Label>
    </div>
  );
};

const TagList = ({ tags, title }: { tags: Tag[]; title: string }) => {
  return (
    <>
      <span className="h-7 truncate px-2 py-1.5 text-xs/4 font-medium text-zinc-500">{title}</span>
      <div className="flex flex-col gap-1">
        {tags.map((tag) => (
          <TagItem key={tag.uid} tag={tag} />
        ))}
      </div>
    </>
  );
};

export default PublicTemplate;
