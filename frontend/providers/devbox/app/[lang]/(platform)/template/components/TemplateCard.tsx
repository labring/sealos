import Image from 'next/image';
import { HTMLAttributes, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { type Tag as TTag } from '@/prisma/generated/client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import EditTemplateModal from '../updateTemplate/EditTemplateModal';
import DeleteTemplateRepositoryModal from '../updateTemplate/DeleteTemplateRepositoryModal';
import EditTemplateRepositoryModal from '../updateTemplate/EditTemplateRepositoryModal';
import { Ellipsis, GitFork, PencilLine, Trash2 } from 'lucide-react';

interface TemplateCardProps extends HTMLAttributes<HTMLDivElement> {
  isPublic?: boolean;
  iconId: string;
  isDisabled?: boolean;
  inPublicStore?: boolean;
  templateRepositoryName: string;
  templateRepositoryDescription: string | null;
  templateRepositoryUid: string;
  tags: TTag[];
}

const TemplateCard = ({
  isPublic,
  iconId,
  templateRepositoryName,
  templateRepositoryDescription,
  templateRepositoryUid,
  isDisabled = false,
  inPublicStore = true,
  tags,
  className,
  ...props
}: TemplateCardProps) => {
  const t = useTranslations();
  const { setStartedTemplate } = useDevboxStore();
  const router = useRouter();
  const description = templateRepositoryDescription
    ? templateRepositoryDescription
    : t('no_description');
  const lastLang = useLocale();

  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isEditRepositoryOpen, setIsEditRepositoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <Card
        className={cn(
          'group relative flex w-full max-w-[440px] flex-col items-start gap-3 border border-gray-200 bg-gray-50 p-5 hover:bg-gray-100',
          isDisabled &&
            'before:pointer-events-none before:absolute before:inset-0 before:bg-white before:opacity-30 before:content-[""]',
          className
        )}
        {...props}
      >
        <div className="h-11 w-full">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex h-full w-0 flex-1 items-center gap-3">
              {/* Python Logo */}
              <Image
                width={32}
                height={32}
                src={`/images/${iconId}.svg`}
                alt={templateRepositoryName}
              />

              {/* Title and Description */}
              <div className="flex w-0 flex-1 flex-col gap-[3px]">
                <div className="flex w-full gap-2">
                  <span className="flex-[0_1_auto] truncate overflow-hidden text-base font-medium tracking-[0.15px] text-gray-900">
                    {templateRepositoryName}
                  </span>
                  {inPublicStore ? (
                    tags.findIndex((tag) => tag.name === 'official') !== -1 ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Image src="/images/official.svg" alt="official" width={20} height={20} />
                        </TooltipTrigger>
                        <TooltipContent>{t('tags_enum.official')}</TooltipContent>
                      </Tooltip>
                    ) : null
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full px-2 text-[10px]',
                        isPublic
                          ? 'border-green-200 bg-green-50 text-green-600'
                          : 'border-[#F4B8FF] bg-[#FDF4FF] text-[#9E00FF]'
                      )}
                    >
                      {t(isPublic ? 'public' : 'private')}
                    </Badge>
                  )}
                </div>
                <div className="w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="h-4 w-0 flex-1 truncate overflow-hidden text-xs tracking-[0.004em] text-gray-500">
                        {description}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>{description}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-[2px]">
              <Button
                size="sm"
                variant="default"
                className="hidden h-7 bg-[#0884DD] px-[10px] text-xs group-hover:flex hover:bg-[#0773c4]"
                onClick={() => {
                  setStartedTemplate({
                    uid: templateRepositoryUid,
                    name: templateRepositoryName,
                    iconId
                  });
                  router.push(`/devbox/create?templateRepository${templateRepositoryUid}`);
                }}
                disabled={isDisabled}
              >
                {t('start_devbox')}
              </Button>
              {!inPublicStore && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-[30px] w-[30px]">
                      <Ellipsis className="text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[100px]">
                    <DropdownMenuItem onClick={() => setIsEditRepositoryOpen(true)}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditTemplateOpen(true)}>
                      <GitFork className="mr-2 h-4 w-4" />
                      {t('version_manage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
        {/* Tags */}
        <div className="flex min-h-[22px] flex-wrap gap-1">
          {tags
            .filter((tag) => tag.name !== 'official')
            .map((tag) => (
              <Badge
                key={tag.uid}
                variant="outline"
                className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-blue-600"
              >
                {tag[lastLang === 'zh' ? 'zhName' : 'enName'] || tag.name}
              </Badge>
            ))}
        </div>
      </Card>

      <EditTemplateModal
        isOpen={isEditTemplateOpen}
        templateRepositoryName={templateRepositoryName}
        onClose={() => setIsEditTemplateOpen(false)}
        uid={templateRepositoryUid}
      />
      <EditTemplateRepositoryModal
        isOpen={isEditRepositoryOpen}
        onClose={() => setIsEditRepositoryOpen(false)}
        uid={templateRepositoryUid}
      />
      <DeleteTemplateRepositoryModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        templateRepositoryName={templateRepositoryName}
        uid={templateRepositoryUid}
      />
    </>
  );
};

export default TemplateCard;
