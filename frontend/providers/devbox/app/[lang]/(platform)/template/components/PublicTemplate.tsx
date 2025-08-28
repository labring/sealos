import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@sealos/shadcn-ui';
import { useRouter } from '@/i18n';
import { useGuideStore } from '@/stores/guide';
import { Tag, TagType } from '@/prisma/generated/client';
import { useTagSelectorStore } from '@/stores/tagSelector';
import { listTag, listTemplateRepository as listTemplateRepositoryApi } from '@/api/template';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useDevboxStore } from '@/stores/devbox';
import { destroyDriver, startDriver, startGuide3 } from '@/hooks/driver';

import { Label } from '@sealos/shadcn-ui/label';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { ScrollArea } from '@sealos/shadcn-ui/scroll-area';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
import { Button } from '@sealos/shadcn-ui/button';

import TemplateCard from './TemplateCard';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import Empty from './Empty';

// Define view modes
type ViewMode = 'overview' | 'category';

const PublicTemplate = ({ search }: { search: string }) => {
  const { selectedTagList, getSelectedTagList, resetTags, setSelectedTag } = useTagSelectorStore();
  const t = useTranslations();
  const { guide3, setGuide3 } = useGuideStore();
  const { setStartedTemplate } = useDevboxStore();
  const router = useRouter();

  // View state management
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [currentCategory, setCurrentCategory] = useState<TagType | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<TagType>>(new Set());

  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });

  let tags = (tagsQuery.data?.tagList || []).sort((a, b) =>
    a.name === 'official' ? -1 : b.name === 'official' ? 1 : 0
  );

  // Set official tag as default selected only on first load for category view
  const hasSetDefaultRef = useRef(false);
  useEffect(() => {
    if (!hasSetDefaultRef.current && tags.length > 0 && viewMode === 'category') {
      const officialTag = tags.find((tag) => tag.name === 'official');
      if (officialTag && selectedTagList.size === 0) {
        setSelectedTag(officialTag.uid, true);
        hasSetDefaultRef.current = true;
      }
    }
  }, [tags, selectedTagList.size, setSelectedTag, viewMode]);

  const [pageQueryBody, setPageQueryBody] = useState({
    page: 1,
    pageSize: 30,
    totalItems: 0,
    totalPage: 0
  });

  // Toggle category expansion in sidebar
  const toggleCategoryExpansion = (category: TagType) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Handle category click - switch to category view and show templates for that category
  const handleCategoryClick = (category: TagType) => {
    switchToCategoryView(category);
  };

  // Switch to category view (when clicking "More" button or category item)
  const switchToCategoryView = (category: TagType) => {
    setViewMode('category');
    setCurrentCategory(category);
    // Auto-expand the selected category
    setExpandedCategories((prev) => new Set([...prev, category]));
    resetTags(); // Clear any existing tag selections - default state with no tags selected

    setPageQueryBody({
      page: 1,
      pageSize: 30,
      totalItems: 0,
      totalPage: 0
    });
  };

  // Switch back to overview
  const switchToOverview = () => {
    setViewMode('overview');
    setCurrentCategory(null);
    resetTags();
  };

  // reset query when search changes (only in category view)
  useEffect(() => {
    if (!search || viewMode !== 'category') return;
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [search, viewMode]);

  // reset query when selected tags change (only in category view)
  useEffect(() => {
    if (viewMode !== 'category') return;
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [selectedTagList, viewMode]);

  // cleanup selected tags when component unmounts
  useEffect(() => {
    return () => {
      resetTags();
    };
  }, [resetTags]);

  // Query for category view - normal pagination with tag filtering
  const categoryQueryBody = {
    page: pageQueryBody.page,
    pageSize: pageQueryBody.pageSize,
    search: viewMode === 'category' ? search : '',
    tags: viewMode === 'category' ? getSelectedTagList() : []
  };

  const listTemplateRepository = useQuery(
    [
      'template-repository-list',
      'template-repository-public',
      categoryQueryBody,
      viewMode,
      currentCategory
    ],
    () => {
      if (viewMode !== 'category') return null;

      // If no tags selected, get more templates for frontend filtering
      const queryPageSize = selectedTagList.size === 0 ? 200 : categoryQueryBody.pageSize;
      const queryPage = selectedTagList.size === 0 ? 1 : categoryQueryBody.page;

      return listTemplateRepositoryApi(
        {
          page: queryPage,
          pageSize: queryPageSize
        },
        categoryQueryBody.tags,
        categoryQueryBody.search
      );
    },
    {
      enabled: viewMode === 'category',
      staleTime: 5000, // Increase stale time to reduce refetching
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      retry: false // Don't retry on failure to avoid delays
    }
  );

  // Query for overview - get top templates by category
  const overviewQueries = useQuery(
    ['template-repository-overview', viewMode],
    async () => {
      if (viewMode !== 'overview') return {};

      const categoryTypes = [
        TagType.PROGRAMMING_LANGUAGE,
        TagType.USE_CASE,
        TagType.OS,
        TagType.MCP
      ];
      const promises = categoryTypes.map(async (categoryType) => {
        try {
          // Get tags of this category type
          const categoryTags = tags.filter((tag) => tag.type === categoryType);
          if (categoryTags.length === 0) return { categoryType, templates: [] };

          // Get top 5 templates for this category by getting all templates and filtering
          // Since we can't query by category directly, we'll get general templates first
          const response = await listTemplateRepositoryApi(
            { page: 1, pageSize: 20 }, // Get more to ensure we have enough after filtering
            [], // No tag filter initially
            ''
          );

          // Filter templates that have tags of this category type
          const filteredTemplates = (response.templateRepositoryList || [])
            .filter((template: any) =>
              template.templateRepositoryTags?.some(
                (tagRef: any) => tagRef.tag?.type === categoryType
              )
            )
            .slice(0, 5); // Take top 5

          return { categoryType, templates: filteredTemplates };
        } catch (error) {
          console.error(`Error fetching templates for category ${categoryType}:`, error);
          return { categoryType, templates: [] };
        }
      });

      const results = await Promise.all(promises);
      return results.reduce(
        (acc, result) => {
          acc[result.categoryType] = result.templates;
          return acc;
        },
        {} as Record<TagType, any[]>
      );
    },
    {
      enabled: viewMode === 'overview' && tags.length > 0,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const templateRepositoryList = useMemo(() => {
    if (viewMode === 'category') {
      const allTemplates = listTemplateRepository.data?.templateRepositoryList || [];

      // If no tags are selected, filter by current category type and apply frontend pagination
      if (selectedTagList.size === 0 && currentCategory) {
        const filtered = allTemplates.filter((template) =>
          template.templateRepositoryTags?.some((tagRef) => tagRef.tag?.type === currentCategory)
        );

        // Apply frontend pagination
        const start = (pageQueryBody.page - 1) * pageQueryBody.pageSize;
        const end = start + pageQueryBody.pageSize;
        return filtered.slice(start, end);
      }

      // If tags are selected, use the backend filtered results (already paginated)
      return allTemplates;
    }
    return [];
  }, [
    listTemplateRepository.data,
    viewMode,
    selectedTagList.size,
    currentCategory,
    pageQueryBody.page,
    pageQueryBody.pageSize
  ]);

  const overviewData = useMemo(() => {
    return overviewQueries.data || ({} as Record<TagType, any[]>);
  }, [overviewQueries.data]);

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
      [TagType.PROGRAMMING_LANGUAGE]: [],
      [TagType.OS]: [],
      [TagType.MCP]: []
    } as Record<TagType, Tag[]>
  );

  useEffect(() => {
    if (
      viewMode === 'category' &&
      listTemplateRepository.isSuccess &&
      listTemplateRepository.data
    ) {
      const data = listTemplateRepository.data.page;

      // If we're filtering by category and no tags selected, adjust pagination
      if (selectedTagList.size === 0 && currentCategory) {
        const allTemplates = listTemplateRepository.data.templateRepositoryList || [];
        const filteredTemplates = allTemplates.filter((template) =>
          template.templateRepositoryTags?.some((tagRef) => tagRef.tag?.type === currentCategory)
        );
        const filteredCount = filteredTemplates.length;

        setPageQueryBody((prev) => ({
          ...prev,
          totalItems: filteredCount,
          totalPage: Math.ceil(filteredCount / prev.pageSize),
          page: Math.min(prev.page, Math.ceil(filteredCount / prev.pageSize) || 1)
        }));
      } else {
        // Use backend pagination for tag-filtered results
        setPageQueryBody((prev) => ({
          ...prev,
          totalItems: data.totalItems || 0,
          totalPage: data.totalPage || 0,
          page: data.page || 1
        }));
      }
    }
  }, [
    listTemplateRepository.data,
    listTemplateRepository.isSuccess,
    viewMode,
    selectedTagList.size,
    currentCategory
  ]);

  const hasFilter = viewMode === 'category' && (!!search || selectedTagList.size > 0);

  // Define category display names and order
  const categoryOrder = [
    { type: TagType.PROGRAMMING_LANGUAGE, title: t('programming_language') },
    { type: TagType.USE_CASE, title: t('use_case') },
    { type: TagType.OS, title: t('os') },
    { type: TagType.MCP, title: t('mcp') }
  ];

  return (
    <div className="flex h-[calc(100vh-200px)] gap-3">
      {/* left sidebar */}
      <div className="w-50 flex flex-shrink-0 flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between px-2 py-1.5">
          <span className="truncate text-sm text-zinc-900">{t('categories')}</span>
        </div>
        <ScrollArea className="flex h-[calc(100vh-200px)] w-full flex-col gap-1 pr-2">
          <div className="flex flex-col gap-1">
            {/* Official Content */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  if (viewMode === 'overview') {
                    handleCategoryClick(TagType.OFFICIAL_CONTENT);
                  } else if (currentCategory === TagType.OFFICIAL_CONTENT) {
                    toggleCategoryExpansion(TagType.OFFICIAL_CONTENT);
                  } else {
                    handleCategoryClick(TagType.OFFICIAL_CONTENT);
                  }
                }}
              >
                <span className="text-sm text-zinc-900">{t('official_content')}</span>
                {viewMode === 'category' &&
                  (expandedCategories.has(TagType.OFFICIAL_CONTENT) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ))}
              </div>
              {viewMode === 'category' && expandedCategories.has(TagType.OFFICIAL_CONTENT) && (
                <div className="pl-4">
                  <div className="flex flex-col gap-1">
                    {tagListCollection[TagType.OFFICIAL_CONTENT].map((tag) => (
                      <TagItem key={tag.uid} tag={tag} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Other Categories */}
            {categoryOrder.map(({ type, title }) => (
              <div key={type}>
                <div
                  className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                  onClick={() => {
                    if (viewMode === 'overview') {
                      handleCategoryClick(type);
                    } else if (currentCategory === type) {
                      toggleCategoryExpansion(type);
                    } else {
                      handleCategoryClick(type);
                    }
                  }}
                >
                  <span className="text-sm text-zinc-900">{title}</span>
                  {viewMode === 'category' &&
                    (expandedCategories.has(type) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    ))}
                </div>
                {viewMode === 'category' && expandedCategories.has(type) && (
                  <div className="pl-4">
                    <div className="flex flex-col gap-1">
                      {tagListCollection[type].map((tag) => (
                        <TagItem key={tag.uid} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* right content */}
      <div className="flex flex-1 flex-col !overflow-visible">
        {viewMode === 'overview' ? (
          // Overview mode - section display
          <ScrollArea className="select-runtime-container h-[calc(100vh-200px)] pr-2">
            <div className="flex flex-col gap-8">
              {categoryOrder.map(({ type, title }) => (
                <TemplateSection
                  key={type}
                  title={title}
                  templates={(overviewData as any)[type] || []}
                  onMoreClick={() => switchToCategoryView(type)}
                  isLoading={overviewQueries.isLoading}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          // Category mode - paginated list with header
          <>
            {/* Category mode header */}
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-lg font-medium text-zinc-900">
                {currentCategory === TagType.OFFICIAL_CONTENT
                  ? t('official_content')
                  : categoryOrder.find((c) => c.type === currentCategory)?.title || t('templates')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm text-zinc-600 hover:text-zinc-900"
                onClick={switchToOverview}
              >
                <span>{t('back')}</span>
              </Button>
            </div>

            <ScrollArea className="select-runtime-container h-[calc(100vh-250px)] pr-2">
              {listTemplateRepository.isLoading || listTemplateRepository.isFetching ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(200px,300px,440px),1fr))] gap-3">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} className="flex flex-col gap-4 rounded-xl border p-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-6 w-16 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : templateRepositoryList.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(200px,300px,440px),1fr))] gap-3">
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
              ) : (
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
          </>
        )}
      </div>
    </div>
  );
};

// Template section for overview mode
const TemplateSection = ({
  title,
  templates,
  onMoreClick,
  isLoading
}: {
  title: string;
  templates: any[];
  onMoreClick: () => void;
  isLoading: boolean;
}) => {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zinc-900">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-sm text-zinc-600 hover:text-zinc-900"
          onClick={onMoreClick}
        >
          <span>{templates.length > 0 && t('more')} </span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(200px,300px,440px),1fr))] gap-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(200px,300px,440px),1fr))] gap-3">
          {templates.slice(0, 5).map((tr) => (
            <TemplateCard
              key={tr.uid}
              iconId={tr.iconId || ''}
              templateRepositoryName={tr.name}
              templateRepositoryDescription={tr.description}
              templateRepositoryUid={tr.uid}
              tags={tr.templateRepositoryTags?.map((t: any) => t.tag) || []}
              isPublic
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-500">
          {t('no_category_templates', { category: title })}
        </div>
      )}
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
