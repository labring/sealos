import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listPrivateTemplateRepository as listPrivateTemplateRepositoryApi } from '@/api/template';

import Empty from './Empty';
import TemplateCard from './TemplateCard';

import { ScrollArea } from '@sealos/shadcn-ui/scroll-area';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';

export default function PrivateTemplate({ search }: { search: string }) {
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

  const queryBody = {
    page: pageQueryBody.page,
    pageSize: pageQueryBody.pageSize,
    search
  };

  const listPrivateTemplateRepository = useQuery(
    ['template-repository-list', 'template-repository-private', queryBody],
    () => {
      return listPrivateTemplateRepositoryApi(queryBody);
    },
    {
      keepPreviousData: true
    }
  );

  useEffect(() => {
    if (
      listPrivateTemplateRepository.isFetched &&
      listPrivateTemplateRepository.isSuccess &&
      listPrivateTemplateRepository.data
    ) {
      const data = listPrivateTemplateRepository.data.page;
      setPageQueryBody((prev) => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }));
    }
  }, [
    listPrivateTemplateRepository.data,
    listPrivateTemplateRepository.isFetched,
    listPrivateTemplateRepository.isSuccess
  ]);

  const privateTemplateRepositoryList =
    listPrivateTemplateRepository.data?.templateRepositoryList || [];

  const hasFilter = !!search;
  const t = useTranslations();

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-3">
      <ScrollArea className="h-[calc(100vh-200px)] pr-2">
        {listPrivateTemplateRepository.isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(210px,340px,540px),1fr))] gap-3">
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
        ) : privateTemplateRepositoryList.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(210px,340px,640px),1fr))] gap-3">
            {privateTemplateRepositoryList.map((tr) => (
              <TemplateCard
                key={tr.uid}
                isPublic={tr.isPublic}
                isDisabled={tr.templates.length === 0}
                iconId={tr.iconId || ''}
                templateRepositoryName={tr.name}
                templateRepositoryDescription={tr.description}
                templateRepositoryUid={tr.uid}
                inPublicStore={false}
                tags={tr.templateRepositoryTags.map((t) => t.tag)}
              />
            ))}
          </div>
        ) : (
          <Empty description={hasFilter ? t('no_search_template_tip') : t('no_template_action')} />
        )}
      </ScrollArea>

      <div className="flex items-center justify-between gap-2.5 pt-2 pr-2 text-sm/5 text-zinc-500">
        <span>{t('Total') + ': ' + pageQueryBody.totalItems}</span>
        <div className="flex items-center gap-3">
          <Pagination
            totalPages={pageQueryBody.totalPage}
            currentPage={pageQueryBody.page}
            onPageChange={(currentPage) => {
              setPageQueryBody((page) => ({
                ...page,
                page: currentPage
              }));
            }}
          />
          <div className="flex items-center gap-1">
            <span className="text-zinc-900">{pageQueryBody.pageSize}</span>/<span>{t('Page')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
