import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTemplate } from '@/api/template';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type DeleteTemplateVersionDialogProps = {
  uid: string;
  version: string;
  template: string;
  isLasted: boolean;
  open: boolean;
  onClose: () => void;
};

const DeleteTemplateVersionDialog = ({
  uid,
  version,
  template,
  isLasted,
  open,
  onClose
}: DeleteTemplateVersionDialogProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const deleteVersion = useMutation(deleteTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['templateList']);
      queryClient.invalidateQueries(['template-repository-list']);
      toast.success(t('delete_template_version_success'));
    },
    onError: (error) => {
      toast.error(error as string);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            {t('delete_version')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-sm/5">
          <p>
            {t.rich('delete_template_version_prompt', {
              version: (<span className="font-semibold">{version}</span>) as any,
              name: (<span className="font-semibold">{template}</span>) as any
            })}
          </p>
          <p>{t('delete_template_version_prompt_2')}</p>
        </div>

        {isLasted && (
          <p className="rounded-lg bg-red-50 p-4 text-sm/5 text-red-600">
            {t('delete_lasted_template_version_prompt')}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteVersion.mutateAsync(uid);
              onClose();
            }}
          >
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTemplateVersionDialog;
