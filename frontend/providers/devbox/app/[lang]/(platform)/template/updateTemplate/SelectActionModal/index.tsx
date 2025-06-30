import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TemplateDropdown from './TemplateDropdown';
import { Plus } from 'lucide-react';

const SelectTemplateModal = ({
  isOpen,
  onClose,
  onOpenCreate,
  onOpenUpdate,
  templateRepositoryList
}: {
  isOpen: boolean;
  onClose: () => void;
  templateRepositoryList: {
    iconId: string | null;
    name: string;
    description: null | string;
    uid: string;
  }[];
  onSubmit?: (data: FormData) => void;
  onOpenCreate: () => void;
  onOpenUpdate: (templateRepoUid: string) => void;
}) => {
  const t = useTranslations();
  const [selectedTemplateRepoUid, setSelectedTemplateRepoUid] = useState(
    templateRepositoryList?.[0]?.uid
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[504px]">
        <DialogHeader>
          <DialogTitle>{t('create_or_update_template')}</DialogTitle>
        </DialogHeader>

        <div className="px-[52px] pt-6 pb-6">
          <p className="mb-2.5 font-medium text-gray-900">{t('select_template_tips')}</p>
          <TemplateDropdown
            templateRepositoryList={templateRepositoryList || []}
            selectedTemplateRepoUid={selectedTemplateRepoUid}
            setSelectedTemplateRepoUid={setSelectedTemplateRepoUid}
          />
        </div>

        <DialogFooter className="gap-4 px-[52px]">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-blue-600"
            onClick={() => {
              onOpenCreate();
              onClose();
            }}
          >
            <Plus className="size-4" />
            {t('create_template')}
          </Button>
          <Button
            onClick={() => {
              if (!selectedTemplateRepoUid) {
                return toast.error(t('select_template_tips'));
              }
              onOpenUpdate(selectedTemplateRepoUid);
              onClose();
            }}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectTemplateModal;
