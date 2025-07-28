import { z } from 'zod';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GitFork, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import DeleteTemplateVersionDialog from '@/components/dialogs/DeleteTemplateVersionDialog';

import { listTemplate } from '@/api/template';

const versionSchema = z.object({
  name: z.string(),
  uid: z.string()
});

type VersionType = z.infer<typeof versionSchema>;

interface TemplateItem {
  uid: string;
  name: string;
  config: string;
  image: string;
  createAt: Date;
  updateAt: Date;
}

interface TableColumn {
  title: string;
  key: keyof TemplateItem | 'control';
  minWidth?: string;
  render?: (item: TemplateItem) => JSX.Element;
}

interface TemplateVersionControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: FormData) => void;
  uid: string;
  templateRepositoryName: string;
}

const TemplateVersionControlDrawer = ({
  isOpen,
  onClose,
  uid,
  templateRepositoryName
}: TemplateVersionControlDrawerProps) => {
  const t = useTranslations();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletedTemplateVersion, setDeletedTemplateVersion] = useState<VersionType | null>();

  const templateRepositoryQuery = useQuery(['templateList', uid], () => listTemplate(uid), {
    enabled: isOpen
  });

  const templateList = templateRepositoryQuery.data?.templateList || [];

  const columns: TableColumn[] = [
    {
      title: t('version_name'),
      key: 'name',
      render: (item) => {
        return <span className="max-w-[100px] truncate whitespace-nowrap">{item.name}</span>;
      }
    },
    {
      title: t('creation_time'),
      key: 'createAt',
      render: (item) => {
        return <span>{dayjs(item.createAt).format('YYYY-MM-DD HH:mm')}</span>;
      }
    },
    {
      title: t('update_time'),
      key: 'updateAt',
      render: (item) => {
        return <span>{dayjs(item.updateAt).format('YYYY-MM-DD HH:mm')}</span>;
      }
    },
    {
      title: '',
      key: 'control',
      minWidth: 'unset',
      render: (item) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-neutral-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => {
            setDeletedTemplateVersion({
              name: item.name,
              uid: item.uid
            });
            setIsDeleteModalOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ];

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="min-w-[600px]">
          <DrawerHeader>
            <DrawerTitle>{t('version_manage')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex h-full flex-col items-center p-6">
            {/* table */}
            {templateList.length > 0 && (
              <div className="w-full overflow-hidden rounded-lg border border-gray-200">
                <Table className="bg-white [&_td]:border-r last:[&_td]:border-r-0 [&_th]:border-r last:[&_th]:border-r-0 [&_tr]:border-b">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead
                          key={column.key}
                          style={{ minWidth: column.minWidth, backgroundColor: 'white' }}
                        >
                          {column.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateList.map((item, index) => (
                      <TableRow key={item.uid || index}>
                        {columns.map((column) => (
                          <TableCell key={column.key} className="text-zinc-900">
                            {column.render
                              ? column.render(item)
                              : column.key !== 'control'
                                ? String(item[column.key] || '')
                                : null}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* TODO: abstract to SFC */}
            {templateList.length === 0 && (
              <div className="flex w-[300px] flex-1 flex-col items-center justify-center gap-3">
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-2">
                  <GitFork className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-center text-sm font-semibold text-black">
                    {t('no_available_versions')}
                  </span>
                  <span className="text-center text-sm/5 font-normal text-neutral-500">
                    {t('no_template_action')}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="border-none bg-transparent"></DrawerFooter>
        </DrawerContent>
      </Drawer>

      {!!deletedTemplateVersion && (
        <DeleteTemplateVersionDialog
          isLasted={templateList.length <= 1}
          version={deletedTemplateVersion.name}
          template={templateRepositoryName}
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          uid={deletedTemplateVersion.uid}
        />
      )}
    </>
  );
};

export default TemplateVersionControlDrawer;
