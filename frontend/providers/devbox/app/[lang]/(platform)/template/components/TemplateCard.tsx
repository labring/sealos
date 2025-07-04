import Image from 'next/image';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Ellipsis, GitFork, PencilLine, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { type Tag as TTag } from '@/prisma/generated/client';
import { tagColorMap, defaultTagColor } from '@/constants/tag';

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

interface TemplateCardProps {
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
  tags
}: TemplateCardProps) => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const { setStartedTemplate } = useDevboxStore();

  const description = templateRepositoryDescription
    ? templateRepositoryDescription
    : t('no_description');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isEditRepositoryOpen, setIsEditRepositoryOpen] = useState(false);

  return (
    <>
      <Card
        className={cn(
          'relative flex w-full max-w-[375px] flex-col items-start border bg-white',
          isDisabled &&
            'before:pointer-events-none before:absolute before:inset-0 before:bg-white before:opacity-30 before:content-[""]'
        )}
      >
        {/* top */}
        <div className="flex h-30 w-full flex-col items-start gap-2 px-4 pt-4 pb-2">
          <div className="group flex items-center justify-between gap-2 self-stretch">
            <div className="flex items-center gap-2">
              {/* logo */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
                <Image
                  width={32}
                  height={32}
                  src={`/images/runtime/${iconId}.svg`}
                  alt={templateRepositoryName}
                />
              </div>
              {/* name */}
              <span className="truncate font-medium">{templateRepositoryName}</span>
              {/* badge */}
              {inPublicStore ? (
                tags.findIndex((tag) => tag.name === 'official') !== -1 ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Image src="/images/official.svg" alt="official" width={24} height={24} />
                    </TooltipTrigger>
                    <TooltipContent>{t('tags_enum.official')}</TooltipContent>
                  </Tooltip>
                ) : null
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-2 text-xs/4 font-medium',
                    isPublic
                      ? 'border-green-200 bg-green-50 text-green-600'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  )}
                >
                  {t(isPublic ? 'public' : 'private')}
                </Badge>
              )}
            </div>
            {/* action */}
            <div className="flex items-center">
              <Button
                className="invisible opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
                size="sm"
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
                {t('select')}
              </Button>
              {!inPublicStore && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Ellipsis className="text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditRepositoryOpen(true)}>
                      <PencilLine className="h-4 w-4" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditTemplateOpen(true)}>
                      <GitFork className="h-4 w-4" />
                      {t('version_manage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col gap-4">
            {/* description */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full truncate text-sm/5 text-zinc-500">{description}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{description}</TooltipContent>
            </Tooltip>
            {/* tag */}
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
