import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTemplateRepository } from '@/api/template';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteTemplateRepositoryDialogProps {
  uid: string;
  templateRepositoryName: string;
  open: boolean;
  onClose: () => void;
}

const DeleteTemplateRepositoryDialog = ({
  uid,
  templateRepositoryName,
  open,
  onClose
}: DeleteTemplateRepositoryDialogProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (uid: string) => {
      return deleteTemplateRepository(uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
      queryClient.invalidateQueries(['template-repository-private']);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-yellow-600" />
            {t('delete_template')}
          </DialogTitle>
        </DialogHeader>

        <span className="text-sm/5">
          {t.rich('delete_template_prompt', {
            name: (
              <span className="font-semibold" key="template-name">
                {templateRepositoryName}
              </span>
            ) as any
          })}
        </span>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await mutation.mutateAsync(uid);
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

export default DeleteTemplateRepositoryDialog;
