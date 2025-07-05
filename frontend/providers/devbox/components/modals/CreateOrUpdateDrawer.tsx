import { toast } from 'sonner';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import TemplateDropdown from '@/components/template/TemplateDropdown';

import { Tag } from '@/prisma/generated/client';

const CreateOrUpdateDrawer = ({
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
    templateRepositoryTags: {
      tag: Tag;
    }[];
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('create_or_update_template')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4">
            <span className="leading-6 font-medium text-zinc-900">{t('select_template_tips')}</span>
            <TemplateDropdown
              templateRepositoryList={templateRepositoryList || []}
              selectedTemplateRepoUid={selectedTemplateRepoUid}
              setSelectedTemplateRepoUid={setSelectedTemplateRepoUid}
            />
          </div>
        </div>

        <DrawerFooter className="gap-3 bg-zinc-50">
          <Button
            variant="ghost"
            className="text-blue-600 hover:bg-transparent hover:text-blue-600"
            onClick={() => {
              onOpenCreate();
              onClose();
            }}
          >
            <Plus className="h-4 w-4" />
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateOrUpdateDrawer;
