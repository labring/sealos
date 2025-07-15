import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';

import { tagColorMap, defaultTagColor } from '@/constants/tag';
import { Tag, type Tag as TTag } from '@/prisma/generated/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TRepositoryItem {
  iconId: string | null;
  name: string;
  description: string | null;
  uid: string;
  templateRepositoryTags: {
    tag: Tag;
  }[];
}

interface TemplateDropdownProps {
  templateRepositoryList: TRepositoryItem[];
  selectedTemplateRepoUid: string | null;
  setSelectedTemplateRepoUid: (uid: string) => void;
}

export default function TemplateDropdown({
  templateRepositoryList,
  selectedTemplateRepoUid,
  setSelectedTemplateRepoUid
}: TemplateDropdownProps) {
  const t = useTranslations();
  const selectedTemplateRepository = templateRepositoryList.find(
    (t) => t.uid === selectedTemplateRepoUid
  );

  return (
    <Popover>
      <PopoverTrigger>
        <TemplateButton
          isActive={false}
          iconId={selectedTemplateRepository?.iconId || ''}
          title={selectedTemplateRepository?.name || ''}
          description={selectedTemplateRepository?.description || ''}
          tags={selectedTemplateRepository?.templateRepositoryTags.map((t) => t.tag) || []}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-100 rounded-xl p-2">
        <span className="flex items-center py-1.5 text-xs/4 font-medium text-zinc-500">
          {t('template')}
        </span>
        <div className="flex flex-col gap-2">
          {templateRepositoryList.map(
            ({ uid, iconId, description, name, templateRepositoryTags }) => (
              <TemplateButton
                key={uid}
                isActive={selectedTemplateRepoUid === uid}
                iconId={iconId || ''}
                isInMenu
                title={name}
                className="border-[#EBEBED] shadow-none"
                description={description || ''}
                tags={templateRepositoryTags.map((t) => t.tag) || []}
                onClick={() => setSelectedTemplateRepoUid(uid)}
              />
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TemplateButtonProps {
  iconId: string;
  title: string;
  isActive?: boolean;
  isInMenu?: boolean;
  description: string;
  tags: TTag[];
  onClick?: () => void;
  className?: string;
}

const TemplateButton = ({
  isActive = false,
  iconId,
  title,
  description,
  tags,
  onClick,
  isInMenu = false,
  className
}: TemplateButtonProps) => {
  const locale = useLocale();
  const t = useTranslations();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={cn(
        'relative inline-flex h-fit w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white p-4 text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none hover:bg-zinc-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
    >
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          {/* logo */}
          <div className="flex items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
            <Image src={`/images/runtime/${iconId || ''}.svg`} width={32} height={32} alt={title} />
          </div>
          <div className="flex w-full flex-col items-start">
            {/* name */}
            <span className="font-medium">{title}</span>
            {/* description */}
            <span className="h-5 truncate text-sm/5 font-normal text-zinc-500">
              {description || t('no_description')}
            </span>
          </div>
        </div>
        {/* TODO: tag color need to be supported */}
        {/* tags */}
        <div className="flex gap-1">
          {tags
            .filter((tag) => tag.name !== 'official')
            .map((tag) => {
              const tagStyle = tagColorMap[tag.type] || defaultTagColor;
              return (
                <Badge
                  key={tag.uid}
                  variant="outline"
                  className="rounded-md border-none bg-zinc-100 px-2"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tagStyle.color }}
                    />
                    <span className="text-xs/4 font-medium text-zinc-600">
                      {tag[locale === 'zh' ? 'zhName' : 'enName'] || tag.name}
                    </span>
                  </div>
                </Badge>
              );
            })}
        </div>
      </div>
      <div className="flex h-full items-center justify-center">
        {!isActive && !isInMenu && <ChevronDown className="h-4 w-4 text-neutral-500" />}
        {isActive && <Check className="h-4 w-4 text-blue-600" />}
      </div>
    </div>
  );
};
