import { z } from 'zod';
import { FC } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usePathname } from '@/i18n';
import { useTemplateStore } from '@/stores/template';
import { TemplateState } from '@/constants/template';
import { createTemplateRepository } from '@/api/template';
import { templateNameSchema, versionSchema } from '@/utils/validate';

import TemplateRepositoryDescriptionField from './components/TemplateRepositoryDescriptionField';
import TemplateRepositoryIsPublicField from './components/TemplateRepositoryIsPublicField';
import TemplateRepositoryNameField from './components/TemplateRepositoryNameField';
import TemplateRepositoryTagField from './components/TemplateRepositoryTagField';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const tagSchema = z.object({
  value: z.string()
});

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  devboxReleaseName: string;
}

const CreateTemplateModal: FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  devboxReleaseName
}) => {
  const t = useTranslations();
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')).pipe(templateNameSchema),
    version: z.string().min(1, t('input_template_version_placeholder')).pipe(versionSchema),
    isPublic: z.boolean().default(false),
    agreeTerms: z.boolean().refine((val) => val === true, t('privacy_and_security_agreement_tips')),
    tags: z
      .array(tagSchema)
      .min(1, t('select_at_least_1_tag'))
      .max(3, t('select_lest_than_3_tags')),
    description: z.string()
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      version: '',
      isPublic: false,
      agreeTerms: false,
      tags: [],
      description: ''
    }
  });

  const { openTemplateModal } = useTemplateStore();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createTemplateRepository
  });
  const lastRoute = usePathname();

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync({
        templateRepositoryName: data.name,
        version: data.version,
        isPublic: data.isPublic,
        description: data.description,
        tagUidList: data.tags.map((tag) => tag.value),
        devboxReleaseName
      });

      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
      form.reset();
      onClose();
      openTemplateModal({
        templateState: TemplateState.privateTemplate,
        lastRoute
      });
      toast.success(t('create_template_success'));
    } catch (error) {
      if (error == '409:templateRepository name already exists') {
        return toast.error(t('template_repository_name_already_exists'));
      }
      toast.error(error as string);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[562px]">
        <DialogHeader>
          <DialogTitle>{t('create_template')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <TemplateRepositoryNameField />

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="w-[108px] text-sm after:ml-0.5 after:text-red-500 after:content-['*']">
                    {t('version')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('input_template_version_placeholder')}
                      className="w-[350px] border-gray-200 bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TemplateRepositoryIsPublicField />
            <TemplateRepositoryTagField />
            <TemplateRepositoryDescriptionField />

            <DialogFooter className="px-[52px] pb-8">
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    onClose();
                  }}
                  className="px-[29.5px] py-2"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="px-[29.5px] py-2"
                  disabled={form.formState.isSubmitting}
                >
                  {t('create')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateModal;
