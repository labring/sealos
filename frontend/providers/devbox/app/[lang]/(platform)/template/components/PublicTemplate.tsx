import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@sealos/shadcn-ui/label';
import { RadioGroup, RadioGroupItem } from '@sealos/shadcn-ui/radio-group';
import { ScrollArea } from '@sealos/shadcn-ui/scroll-area';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
import { Button } from '@sealos/shadcn-ui/button';
import { cn } from '@sealos/shadcn-ui';

import { useRouter } from '@/i18n';
import { useGuideStore } from '@/stores/guide';
import { Tag, TagType } from '@/prisma/generated/client';
import { useTagSelectorStore } from '@/stores/tagSelector';
import { listTag, listTemplateRepository as listTemplateRepositoryApi } from '@/api/template';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useDevboxStore } from '@/stores/devbox';
import { destroyDriver, startDriver, startGuide3 } from '@/hooks/driver';

import TemplateCard from './TemplateCard';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import Empty from './Empty';

// Define view modes
type ViewMode = 'overview' | 'category';

// Define category types based on USE_CASE tag names
type CategoryType = 'official' | 'language' | 'framework' | 'os' | 'mcp';

const PublicTemplate = ({ search }: { search: string }) => {
  const { selectedTagList, getSelectedTagList, resetTags, setSelectedTag } = useTagSelectorStore();
  const t = useTranslations();
  const { guide3, setGuide3 } = useGuideStore();
  const { setStartedTemplate } = useDevboxStore();
  const router = useRouter();

  // View state management
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [currentCategory, setCurrentCategory] = useState<CategoryType | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryType>>(new Set());

  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });

  // Get all tags for different purposes
  const allTags = useMemo(() => {
    return tagsQuery.data?.tagList || [];
  }, [tagsQuery.data?.tagList]);

  // Filter USE_CASE tags for main categories
  const useCaseTags = useMemo(() => {
    return allTags
      .filter((tag) => tag.type === TagType.USE_CASE)
      .sort((a, b) => (a.name === 'official' ? -1 : b.name === 'official' ? 1 : 0));
  }, [allTags]);

  // Get programming language tags
  const programmingLanguageTags = useMemo(() => {
    return allTags.filter((tag) => tag.type === TagType.PROGRAMMING_LANGUAGE);
  }, [allTags]);

  // No default tag selection needed - tags are auto-selected when switching to category view

  const [pageQueryBody, setPageQueryBody] = useState({
    page: 1,
    pageSize: 30,
    totalItems: 0,
    totalPage: 0
  });

  // Toggle category expansion in sidebar
  const toggleCategoryExpansion = useCallback((category: CategoryType) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Switch to category view (when clicking "More" button or category item)
  const switchToCategoryView = useCallback(
    (category: CategoryType) => {
      setViewMode('category');
      setCurrentCategory(category);
      // Auto-expand the selected category
      setExpandedCategories((prev) => new Set([...prev, category]));

      // Reset tags first, then auto-select the category tag
      resetTags();

      if (category === 'official') {
        // For official category, auto-select all OFFICIAL_CONTENT tags
        const officialTags = allTags.filter((tag) => tag.type === TagType.OFFICIAL_CONTENT);
        officialTags.forEach((tag) => {
          setSelectedTag(tag.uid, true);
        });
      } else {
        // Auto-select the corresponding USE_CASE tag for other categories
        const categoryTag = useCaseTags.find((tag) => tag.name === category);
        if (categoryTag) {
          setSelectedTag(categoryTag.uid, true);
        }
      }

      setPageQueryBody({
        page: 1,
        pageSize: 30,
        totalItems: 0,
        totalPage: 0
      });
    },
    [resetTags, useCaseTags, setSelectedTag, allTags]
  );

  // Handle category click - switch to category view and show templates for that category
  const handleCategoryClick = useCallback(
    (category: CategoryType) => {
      switchToCategoryView(category);
    },
    [switchToCategoryView]
  );

  // Switch back to overview
  const switchToOverview = useCallback(() => {
    setViewMode('overview');
    setCurrentCategory(null);
    resetTags();
  }, [resetTags]);

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

      return listTemplateRepositoryApi(
        {
          page: categoryQueryBody.page,
          pageSize: categoryQueryBody.pageSize
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

      // Define the categories we want to show in overview
      const categoryNames: CategoryType[] = ['language', 'framework', 'os'];
      const promises = categoryNames.map(async (categoryName) => {
        try {
          // Find the specific tag for this category
          const categoryTag = useCaseTags.find((tag) => tag.name === categoryName);
          if (!categoryTag) return { categoryName, templates: [] };

          // Get top 5 templates for this category by filtering with the specific tag
          const response = await listTemplateRepositoryApi(
            { page: 1, pageSize: 20 }, // Get more to ensure we have enough after filtering
            [categoryTag.uid], // Filter by the specific category tag
            ''
          );

          // Take top 5 templates
          const filteredTemplates = (response.templateRepositoryList || []).slice(0, 5);

          return { categoryName, templates: filteredTemplates };
        } catch (error) {
          console.error(`Error fetching templates for category ${categoryName}:`, error);
          return { categoryName, templates: [] };
        }
      });

      const results = await Promise.all(promises);
      return results.reduce(
        (acc, result) => {
          acc[result.categoryName] = result.templates;
          return acc;
        },
        {} as Record<CategoryType, any[]>
      );
    },
    {
      enabled: viewMode === 'overview' && useCaseTags.length > 0,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const templateRepositoryList = useMemo(() => {
    if (viewMode === 'category') {
      const allTemplates = listTemplateRepository.data?.templateRepositoryList || [];
      // Now we always use backend filtered results since we always have tags selected
      return allTemplates;
    }
    return [];
  }, [listTemplateRepository.data, viewMode]);

  const overviewData = useMemo(() => {
    return overviewQueries.data || ({} as Record<CategoryType, any[]>);
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

  // Query to get framework templates to determine which languages have frameworks
  const frameworkLanguagesQuery = useQuery(
    ['framework-languages'],
    async () => {
      const frameworkTag = useCaseTags.find((tag) => tag.name === 'framework');
      if (!frameworkTag) return new Set<string>();

      try {
        const response = await listTemplateRepositoryApi(
          { page: 1, pageSize: 100 }, // Get enough to cover all framework templates
          [frameworkTag.uid], // Filter by framework tag
          ''
        );

        // Extract all programming language tags from framework templates
        const frameworkLanguageUids = new Set<string>();
        response.templateRepositoryList?.forEach((template) => {
          template.templateRepositoryTags?.forEach((tagRelation) => {
            if (tagRelation.tag.type === 'PROGRAMMING_LANGUAGE') {
              frameworkLanguageUids.add(tagRelation.tag.uid);
            }
          });
        });

        return frameworkLanguageUids;
      } catch (error) {
        console.error('Error fetching framework languages:', error);
        return new Set<string>();
      }
    },
    {
      enabled: useCaseTags.length > 0,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Group tags by their category type
  const tagListCollection = useMemo(() => {
    const collection = {
      official: [] as Tag[],
      language: [] as Tag[],
      framework: [] as Tag[],
      os: [] as Tag[],
      mcp: [] as Tag[]
    };

    // For official category, add all OFFICIAL_CONTENT tags
    collection.official = allTags.filter((tag) => tag.type === TagType.OFFICIAL_CONTENT);

    // Add USE_CASE tags to their respective categories, but exclude main category tags from their own secondary menus
    useCaseTags.forEach((tag) => {
      const categoryName = tag.name as CategoryType;
      if (collection[categoryName] && categoryName !== 'official') {
        // Don't add the main category tag to its own secondary menu
        // For example, don't add "language" tag to language category's secondary menu
        // or "framework" tag to framework category's secondary menu
        if (tag.name !== categoryName) {
          collection[categoryName].push(tag);
        }
      }
    });

    // For language category, add all PROGRAMMING_LANGUAGE tags (this replaces any USE_CASE tags)
    collection.language = programmingLanguageTags;

    // For framework category, only add programming languages that actually have framework templates
    const frameworkLanguageUids = frameworkLanguagesQuery.data || new Set<string>();
    collection.framework = [
      ...collection.framework,
      ...programmingLanguageTags.filter((tag) => frameworkLanguageUids.has(tag.uid))
    ];

    return collection;
  }, [useCaseTags, programmingLanguageTags, frameworkLanguagesQuery.data, allTags]);

  useEffect(() => {
    if (
      viewMode === 'category' &&
      listTemplateRepository.isSuccess &&
      listTemplateRepository.data
    ) {
      const data = listTemplateRepository.data.page;

      // Always use backend pagination since we always have tags selected
      setPageQueryBody((prev) => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }));
    }
  }, [listTemplateRepository.data, listTemplateRepository.isSuccess, viewMode]);

  const hasFilter = viewMode === 'category' && (!!search || selectedTagList.size > 0);

  // Define category display names and order
  const categoryOrder = useMemo(
    () => [
      { type: 'language' as CategoryType, title: t('language') },
      { type: 'framework' as CategoryType, title: t('framework') },
      { type: 'os' as CategoryType, title: t('os') }
    ],
    [t]
  );

  return (
    <div className="flex h-[calc(100vh-200px)] gap-3">
      {/* left sidebar */}
      <div className="flex w-50 flex-shrink-0 flex-col items-start gap-1">
        <ScrollArea className="flex h-[calc(100vh-200px)] w-full flex-col gap-1 pr-2">
          <div className="flex flex-col gap-1">
            {/* Official Picks */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  handleCategoryClick('official');
                }}
              >
                <span className="text-sm text-zinc-900">{t('official')}</span>
              </div>
            </div>

            {/* Language */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  if (viewMode === 'overview') {
                    handleCategoryClick('language');
                  } else if (currentCategory === 'language') {
                    toggleCategoryExpansion('language');
                  } else {
                    handleCategoryClick('language');
                  }
                }}
              >
                <span className="text-sm text-zinc-900">{t('language')}</span>
              </div>
              {viewMode === 'category' && expandedCategories.has('language') && (
                <div className="w-full pl-4">
                  <CategoryRadioGroup tags={tagListCollection.language} category="language" />
                </div>
              )}
            </div>

            {/* Framework */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  if (viewMode === 'overview') {
                    handleCategoryClick('framework');
                  } else if (currentCategory === 'framework') {
                    toggleCategoryExpansion('framework');
                  } else {
                    handleCategoryClick('framework');
                  }
                }}
              >
                <span className="text-sm text-zinc-900">{t('framework')}</span>
              </div>
              {viewMode === 'category' && expandedCategories.has('framework') && (
                <div className="w-full pl-4">
                  <CategoryRadioGroup tags={tagListCollection.framework} category="framework" />
                </div>
              )}
            </div>

            {/* OS */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  if (viewMode === 'overview') {
                    handleCategoryClick('os');
                  } else if (currentCategory === 'os') {
                    toggleCategoryExpansion('os');
                  } else {
                    handleCategoryClick('os');
                  }
                }}
              >
                <span className="text-sm text-zinc-900">{t('os')}</span>
              </div>
              {viewMode === 'category' && expandedCategories.has('os') && (
                <div className="w-full pl-4">
                  <CategoryRadioGroup tags={tagListCollection.os} category="os" />
                </div>
              )}
            </div>

            {/* MCP */}
            <div>
              <div
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 hover:bg-[rgba(0,0,0,0.04)]"
                onClick={() => {
                  if (viewMode === 'overview') {
                    handleCategoryClick('mcp');
                  } else if (currentCategory === 'mcp') {
                    toggleCategoryExpansion('mcp');
                  } else {
                    handleCategoryClick('mcp');
                  }
                }}
              >
                <span className="text-sm text-zinc-900">{t('mcp')}</span>
              </div>
              {viewMode === 'category' && expandedCategories.has('mcp') && (
                <div className="w-full pl-4">
                  <CategoryRadioGroup tags={tagListCollection.mcp} category="mcp" />
                </div>
              )}
            </div>
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
                  templates={(overviewData as Record<CategoryType, any[]>)[type] || []}
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
                {currentCategory === 'official'
                  ? t('official')
                  : currentCategory === 'language'
                    ? t('language')
                    : currentCategory === 'framework'
                      ? t('framework')
                      : currentCategory === 'os'
                        ? t('os')
                        : currentCategory === 'mcp'
                          ? t('mcp')
                          : t('templates')}
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

const TagItem = ({ tag, onSelect }: { tag: Tag; onSelect: (value: string) => void }) => {
  const locale = useLocale();

  if (!tag) return null;

  const handleClick = () => {
    onSelect(tag.uid);
  };

  return (
    <div
      className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-200"
      onClick={handleClick}
    >
      <RadioGroupItem value={tag.uid} id={tag.uid} className="border-zinc-900" />
      <Label htmlFor={tag.uid} className="w-full cursor-pointer text-sm text-zinc-900">
        {tag[locale === 'zh' ? 'zhName' : 'enName'] || tag.name}
      </Label>
    </div>
  );
};

const CategoryRadioGroup = ({ tags, category }: { tags: Tag[]; category: CategoryType }) => {
  const { selectedTagsByCategory, setSelectedTagInCategory } = useTagSelectorStore();

  // Find the currently selected tag in this specific category
  const selectedValue = selectedTagsByCategory[category] || '';

  const handleValueChange = (value: string) => {
    if (value) {
      setSelectedTagInCategory(value, category);
    }
  };

  return (
    <RadioGroup
      className="flex w-full flex-col gap-1"
      value={selectedValue}
      onValueChange={handleValueChange}
    >
      {tags.map((tag) => (
        <TagItem key={tag.uid} tag={tag} onSelect={handleValueChange} />
      ))}
    </RadioGroup>
  );
};

export default PublicTemplate;
