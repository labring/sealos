import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRouter } from '@/i18n';
import { createTemplateRepository } from '@/api/template';
import { templateNameSchema, versionSchema } from '@/utils/validate';

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import NameField from '@/components/template/NameField';
import TagsField from '@/components/template/TagsField';
import VersionField from '@/components/template/VersionField';
import IsPublicField from '@/components/template/IsPublicField';
import DescriptionField from '@/components/template/DescriptionField';
import AgreeTermsField from '@/components/template/AgreeTermsField';

const tagSchema = z.object({
  value: z.string()
});

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  devboxReleaseName: string;
}

const CreateTemplateDrawer = ({ isOpen, onClose, devboxReleaseName }: CreateTemplateModalProps) => {
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

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createTemplateRepository
  });
  const router = useRouter();

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
      toast.success(t('create_template_success'));
      router.push(`/template?tab=private`);
    } catch (error) {
      if (error == '409:templateRepository name already exists') {
        return toast.error(t('template_repository_name_already_exists'));
      }
      toast.error(error as string);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('create_template')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-5 p-6">
          <Form {...form}>
            <NameField form={form} />
            <VersionField form={form} />
            <TagsField form={form} />
            <DescriptionField form={form} />
            <Separator />
            <div className="flex flex-col items-center gap-3">
              <IsPublicField form={form} />
              <AgreeTermsField form={form} />
            </div>
          </Form>
        </div>

        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => {
              form.reset();
              onClose();
            }}
          >
            {t('cancel')}
          </Button>
          <Button disabled={form.formState.isSubmitting} onClick={form.handleSubmit(onSubmit)}>
            {t('create')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateTemplateDrawer;
