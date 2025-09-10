import { WorkspaceQuotaItem } from '@/types/workspace';
import { resourcePropertyMap } from '@/constants/resource';
import { buttonVariants, cn, Separator } from '@sealos/shadcn-ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@sealos/shadcn-ui/alert-dialog';
import { TriangleAlert, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { sealosApp } from 'sealos-desktop-sdk/app';

export function InsufficientQuotaDialog({
  items,
  open,
  onOpenChange,
  onConfirm
}: {
  items: WorkspaceQuotaItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const t = useTranslations();

  const handleOpenCostcenter = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'upgrade'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'upgrade'
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert size={16} className="text-yellow-600" />
            <span>{t('insufficient_quota_dialog.title')}</span>
          </AlertDialogTitle>
          <div className="absolute top-4 right-4 text-foreground">
            <XIcon size={20} onClick={() => onOpenChange(false)} className="cursor-pointer" />
          </div>
          <AlertDialogDescription className="text-foreground">
            <div className="flex flex-col rounded-lg bg-orange-50">
              <p className="p-4">{t('insufficient_quota_dialog.alert-title')}</p>
              <Separator className="border-b border-dashed border-zinc-300 bg-transparent" />
              <div className="flex flex-col gap-2 p-4">
                {items.map((item) => {
                  const props = resourcePropertyMap[item.type] ?? null;
                  if (!props) return null;

                  return (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <props.icon className="h-5 w-5 stroke-[1.5] text-neutral-400" />
                        <span>{t(item.type)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          {t('insufficient_quota_dialog.quota_total')}
                          {item.limit / props.scale} {props.unit}
                        </div>
                        <div className="h-3">
                          <Separator orientation="vertical" className="bg-zinc-300" />
                        </div>
                        <div>
                          {t('insufficient_quota_dialog.quota_in_use')}
                          {item.used / props.scale} {props.unit}
                        </div>
                        <div className="h-3">
                          <Separator orientation="vertical" className="bg-zinc-300" />
                        </div>
                        <div className="text-red-600">
                          {t('insufficient_quota_dialog.quota_available')}
                          {(item.limit - item.used) / props.scale} {props.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <span> {t('insufficient_quota_dialog.please_upgrade_plan.1')}</span>
              <a
                className="cursor-pointer font-semibold text-blue-600 underline"
                onClick={handleOpenCostcenter}
              >
                {t('insufficient_quota_dialog.please_upgrade_plan.2')}
              </a>
              <span>{t('insufficient_quota_dialog.please_upgrade_plan.3')}</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('insufficient_quota_dialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {t('insufficient_quota_dialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
