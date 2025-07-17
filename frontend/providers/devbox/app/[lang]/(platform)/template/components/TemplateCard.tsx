import Image from 'next/image';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Ellipsis, GitFork, PencilLine, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { listTemplate } from '@/api/template';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { type Tag as TTag } from '@/prisma/generated/client';
import { tagColorMap, defaultTagColor } from '@/constants/tag';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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

import TemplateVersionControlDrawer from '@/components/drawers/TemplateVersionControlDrawer';
import EditTemplateRepositoryDrawer from '@/components/drawers/EditTemplateRepositoryDrawer';
import DeleteTemplateRepositoryDialog from '@/components/dialogs/DeleteTemplateRepositoryDialog';
import { destroyDriver } from '@/hooks/driver';

interface TemplateCardProps {
  isPublic?: boolean;
  iconId: string;
  isDisabled?: boolean;
  inPublicStore?: boolean;
  templateRepositoryName: string;
  templateRepositoryDescription: string | null;
  templateRepositoryUid: string;
  tags: TTag[];
  forceHover?: boolean;
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
  forceHover = false
}: TemplateCardProps) => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const { setStartedTemplate } = useDevboxStore();
  const { setGuide3, guide3 } = useGuideStore();
  const description = templateRepositoryDescription
    ? templateRepositoryDescription
    : t('no_description');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditTemplateVersionOpen, setIsEditTemplateVersionOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  const { data: templateVersions } = useQuery({
    queryKey: ['template-versions', templateRepositoryUid],
    queryFn: async () => {
      const { templateList } = await listTemplate(templateRepositoryUid);
      if (templateList.length > 0) {
        setSelectedVersion(templateList[0].uid);
      }
      return templateList;
    }
  });

  const handleSelectTemplate = () => {
    setStartedTemplate({
      uid: templateRepositoryUid,
      name: templateRepositoryName,
      iconId,
      templateUid: selectedVersion,
      description: templateRepositoryDescription
    });
    setGuide3(true);
    destroyDriver();
    router.push(`/devbox/create${from ? `?from=${from}` : ''}`);
  };

  return (
    <>
      <Card
        className={cn(
          'group relative flex w-full max-w-[375px] flex-col items-start border bg-white hover:border-zinc-900',
          isDisabled &&
            'pointer-events-none cursor-not-allowed select-none before:absolute before:inset-0 before:z-10 before:bg-white/10 [&_*]:cursor-not-allowed [&_*]:opacity-80',
          forceHover && !guide3 && 'border-zinc-900'
        )}
      >
        {/* top */}
        <div className="flex w-full flex-col items-start gap-2 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 self-stretch">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="max-w-30 cursor-pointer truncate font-medium">
                    {templateRepositoryName}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">{templateRepositoryName}</TooltipContent>
              </Tooltip>
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
            <div className="flex items-center gap-1">
              <Button
                className="invisible opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
                size="sm"
                onClick={handleSelectTemplate}
                disabled={isDisabled || !selectedVersion}
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
                    <DropdownMenuItem onClick={() => setIsEditTemplateOpen(true)}>
                      <PencilLine className="h-4 w-4" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditTemplateVersionOpen(true)}>
                      <GitFork className="h-4 w-4" />
                      {t('version_manage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} variant="destructive">
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
                .sort((a, b) => {
                  if (a.type === 'USE_CASE' && b.type === 'PROGRAMMING_LANGUAGE') return -1;
                  if (a.type === 'PROGRAMMING_LANGUAGE' && b.type === 'USE_CASE') return 1;
                  return a.type.localeCompare(b.type);
                })
                .map((tag) => {
                  const tagStyle = tagColorMap[tag.type] || defaultTagColor;
                  return (
                    <Badge
                      key={tag.uid}
                      variant="outline"
                      className="rounded-md border-none bg-zinc-100 px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
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
        {/* bottom */}
        <div className="borer-t w-full border-zinc-100">
          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger className="w-full rounded-t-none rounded-b-xl border-x-0 border-t-1 border-b-0 text-sm text-zinc-900">
              <SelectValue placeholder={t('select_version')} />
            </SelectTrigger>
            <SelectContent>
              {templateVersions?.map((version) => (
                <SelectItem key={version.uid} value={version.uid}>
                  <span className="text-sm">{version.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <TemplateVersionControlDrawer
        isOpen={isEditTemplateVersionOpen}
        templateRepositoryName={templateRepositoryName}
        onClose={() => setIsEditTemplateVersionOpen(false)}
        uid={templateRepositoryUid}
      />
      <EditTemplateRepositoryDrawer
        open={isEditTemplateOpen}
        onClose={() => setIsEditTemplateOpen(false)}
        uid={templateRepositoryUid}
      />
      <DeleteTemplateRepositoryDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        templateRepositoryName={templateRepositoryName}
        uid={templateRepositoryUid}
      />
    </>
  );
};

export default TemplateCard;
