import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  className
}: PaginationProps) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 pt-2 text-sm/5 text-zinc-500',
        className
      )}
    >
      <span>
        {t('total')}: {totalItems}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[0.5px] text-zinc-900 shadow-none"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[0.5px] text-zinc-900 shadow-none"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 font-medium">
            <span className="text-zinc-900">{currentPage}</span>/<span>{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[0.5px] text-zinc-900 shadow-none"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[0.5px] text-zinc-900 shadow-none"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-900">{pageSize}</span>/<span>{t('page')}</span>
        </div>
      </div>
    </div>
  );
}
