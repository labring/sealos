import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { useGuideStore } from '@/stores/guide';
import { Tag, TagType } from '@/prisma/generated/client';
import { useTagSelectorStore } from '@/stores/tagSelector';
import { listTag, listTemplateRepository as listTemplateRepositoryApi } from '@/api/template';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useDevboxStore } from '@/stores/devbox';
import { destroyDriver, startDriver, startGuide3 } from '@/hooks/driver';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

import TemplateCard from './TemplateCard';
import { Pagination } from '@/components/ui/pagination';
import Empty from './Empty';

const PublicTemplate = ({ search }: { search: string }) => {
  const { selectedTagList, getSelectedTagList, resetTags } = useTagSelectorStore();
  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });

  let tags = (tagsQuery.data?.tagList || []).sort((a, b) =>
    a.name === 'official' ? -1 : b.name === 'official' ? 1 : 0
  );

  const t = useTranslations();
  const { guide3, setGuide3 } = useGuideStore();
  const { setStartedTemplate } = useDevboxStore();
  const router = useRouter();
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
  const templateRepositoryList = useMemo(
    () => listTemplateRepository.data?.templateRepositoryList || [],
    [listTemplateRepository.data]
  );

  const isClientSide = useClientSideValue(true);
  useEffect(() => {
    if (!guide3 && isClientSide && templateRepositoryList.length > 0) {
      startDriver(
        startGuide3(t, () => {
          const first = templateRepositoryList[0];
          setStartedTemplate({
            uid: first.uid,
            name: first.name,
            iconId: first.iconId || '',
            templateUid: first.templates?.[0]?.uid || '',
            description: first.description
          });
          setGuide3(true);
          destroyDriver();
          router.push('/devbox/create');
        })
      );
    }
  }, [guide3, isClientSide, templateRepositoryList, setGuide3, setStartedTemplate, router, t]);

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

  const hasFilter = !!search || selectedTagList.size > 0;

  return (
    <div className="flex h-[calc(100vh-200px)] gap-3">
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
      <div className="flex flex-1 flex-col !overflow-visible">
        <ScrollArea className="select-runtime-container h-[calc(100vh-200px)] pr-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(210px,300px,440px),1fr))] gap-3">
            {templateRepositoryList.map((tr, idx) => (
              <TemplateCard
                key={tr.uid}
                iconId={tr.iconId || ''}
                templateRepositoryName={tr.name}
                templateRepositoryDescription={tr.description}
                templateRepositoryUid={tr.uid}
                tags={tr.templateRepositoryTags.map((t) => t.tag)}
                isPublic
                forceHover={idx === 0}
              />
            ))}
          </div>
          {templateRepositoryList.length === 0 && (
            <Empty
              description={hasFilter ? t('no_search_template_tip') : t('no_template_action')}
            />
          )}
        </ScrollArea>
        <Pagination
          className="pr-2"
          pageSize={pageQueryBody.pageSize}
          totalPages={pageQueryBody.totalPage}
          totalItems={pageQueryBody.totalItems}
          currentPage={pageQueryBody.page}
          onPageChange={(currentPage) => {
            setPageQueryBody((page) => ({
              ...page,
              page: currentPage
            }));
          }}
        />
      </div>
    </div>
  );
};

const TagItem = ({ tag }: { tag: Tag }) => {
  const { selectedTagList, setSelectedTag } = useTagSelectorStore();
  const locale = useLocale();

  if (!tag) return null;

  const isSelected = selectedTagList.has(tag.uid);
  const toggleSelection = () => {
    setSelectedTag(tag.uid, !isSelected);
  };

  return (
    <div
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1',
        isSelected && 'bg-[rgba(0,0,0,0.04)]'
      )}
      onClick={toggleSelection}
    >
      <Checkbox
        id={tag.uid}
        className="border-zinc-900"
        checked={isSelected}
        onCheckedChange={toggleSelection}
      />
      <Label
        htmlFor={tag.uid}
        className="w-full cursor-pointer text-sm text-zinc-900"
        onClick={(e) => {
          e.preventDefault();
          toggleSelection();
        }}
      >
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
