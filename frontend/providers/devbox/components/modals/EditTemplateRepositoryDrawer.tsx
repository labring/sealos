import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { FC, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import NameField from '@/components/template/NameField';
import TagsField from '@/components/template/TagsField';
import IsPublicField from '@/components/template/IsPublicField';
import DescriptionField from '@/components/template/DescriptionField';

import { TemplateVersionState } from '@/constants/template';
import { getTemplateRepository, updateTemplateRepository } from '@/api/template';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const tagSchema = z.object({
  value: z.string().min(1)
});

const versionSchema = z.object({
  name: z.string(),
  uid: z.string(),
  state: z.nativeEnum(TemplateVersionState)
});

type VersionType = z.infer<typeof versionSchema>;

interface EditTemplateRepositoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: FormData) => void;
  uid: string;
}

const EditTemplateRepositoryDrawer: FC<EditTemplateRepositoryDrawerProps> = ({
  open,
  onClose,
  uid
}) => {
  const t = useTranslations();
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')),
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
    defaultValues: {
      name: '',
      isPublic: false,
      agreeTerms: false,
      tags: [],
      description: ''
    }
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
    setValue
  } = form;

  const [publicIsDisabled, setPublicIsDisabled] = useState(false);
  const templateRepositoryQuery = useQuery(
    ['template-repository-detail', uid],
    () => getTemplateRepository(uid),
    {
      enabled: open
    }
  );

  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateTemplateRepository, {
    onSuccess() {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
    }
  });

  const templateRepository = templateRepositoryQuery.data?.templateRepository;

  useEffect(() => {
    if (open && templateRepository && templateRepositoryQuery.isSuccess) {
      setValue(
        'tags',
        templateRepository.templateRepositoryTags.map(({ tag }) => ({
          value: tag.uid
        }))
      );

      setValue('name', templateRepository.name);
      setValue('description', templateRepository.description || '');
      setValue('isPublic', templateRepository.isPublic);
      if (templateRepository.isPublic) {
        setPublicIsDisabled(true);
        setValue('agreeTerms', true);
      }
    }
  }, [templateRepository, open, setValue, templateRepositoryQuery.isSuccess]);

  const onSubmitHandler = async (_data: FormData) => {
    try {
      const result = formSchema.safeParse(_data);
      if (!result.success) {
        const error = result.error.errors[0];
        toast.error(error.message);
        return;
      }
      const data = result.data;
      await updateMutation.mutateAsync({
        uid,
        templateRepositoryName: data.name,
        isPublic: data.isPublic,
        description: data.description,
        tagUidList: data.tags.map(({ value }) => value)
      });
      queryClient.invalidateQueries(['template-repository-list']);
      reset();
      onClose();
      toast.success(t('template_ssaved_successfully'));
    } catch (error) {
      toast.error(error as string);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmitHandler)} className="h-full">
            <DrawerHeader>
              <DrawerTitle>{t('edit_template')}</DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-5 p-6">
              <NameField form={form} disabled />
              <IsPublicField form={form} />
              <TagsField form={form} />
              <DescriptionField form={form} />
            </div>
          </form>
        </Form>
        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('cancel')}
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit(onSubmitHandler)}>
            {t('save_template')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EditTemplateRepositoryDrawer;
