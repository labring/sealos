import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listPrivateTemplateRepository as listPrivateTemplateRepositoryApi } from '@/api/template';

import TemplateCard from './TemplateCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination } from '@/components/ui/pagination';

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

  const t = useTranslations();
  const privateTemplateRepositoryList =
    listPrivateTemplateRepository.data?.templateRepositoryList || [];

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-3">
      <ScrollArea className="h-[calc(100vh-200px)] pr-2">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(210px,300px,440px),1fr))] gap-3">
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

        {privateTemplateRepositoryList.length === 0 && (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-4">
            <div className="text-center text-zinc-600">{t('no_template_repository_versions')}</div>
          </div>
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
  );
}
