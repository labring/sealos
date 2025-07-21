import { z } from 'zod';
import { toast } from 'sonner';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { versionSchema } from '@/utils/validate';
import { updateTemplate, listTag } from '@/api/template';
import { Tag, TagType } from '@/prisma/generated/client';

import NameField from '@/components/template/NameField';
import TagsField from '@/components/template/TagsField';
import DescriptionField from '@/components/template/DescriptionField';
import UpdateTemplateConfirmDialog from '@/components/dialogs/UpdateTemplateConfirmDialog';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface UpdateTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  devboxReleaseName: string;
  templateRepository: {
    uid: string;
    name: string;
    description: string | null;
    iconId: string | null;
    isPublic: boolean;
    templates: {
      uid: string;
      name: string;
    }[];
    templateRepositoryTags: {
      tag: {
        uid: string;
        name: string;
      };
    }[];
  };
}

const UpdateTemplateDrawer = ({
  isOpen,
  onClose,
  templateRepository,
  devboxReleaseName
}: UpdateTemplateDrawerProps) => {
  const t = useTranslations();
  const tagSchema = z.object({
    value: z.string()
  });
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')),
    version: z.string().min(1, t('input_template_version_placeholder')).pipe(versionSchema),
    tags: z
      .array(tagSchema)
      .min(1, t('select_at_least_1_tag'))
      .max(3, t('select_lest_than_3_tags')),
    description: z.string()
  });

  const queryClient = useQueryClient();
  type FormData = z.infer<typeof formSchema>;
  const mutation = useMutation(updateTemplate, {
    onSuccess() {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
    }
  });

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      version: '',
      tags: [],
      description: ''
    }
  });

  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });
  const tagList = (tagsQuery.data?.tagList || []).filter((tag) => tag.name !== 'official');
  const tagListCollection = tagList.reduce(
    (acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    },
    {
      [TagType.OFFICIAL_CONTENT]: [],
      [TagType.USE_CASE]: [],
      [TagType.PROGRAMMING_LANGUAGE]: []
    } as Record<TagType, Tag[]>
  );

  useEffect(() => {
    if (templateRepository && isOpen) {
      form.setValue(
        'tags',
        templateRepository.templateRepositoryTags.map(({ tag }) => ({
          value: tag.uid
        }))
      );
      form.setValue('version', templateRepository.templates[0]?.name || '');
      form.setValue('name', templateRepository.name);
      form.setValue('description', templateRepository.description || '');
    }
  }, [templateRepository, isOpen, form]);

  const [showOverview, setShowOverview] = useState(false);

  const submit = async (_data: FormData) => {
    try {
      const result = formSchema.safeParse(_data);
      if (!result.success) {
        const error = result.error.errors[0];
        if (error.path[0] === 'version' && error.code === 'invalid_string') {
          toast.error(t('invalide_template_version'));
          return;
        }
        toast.error(error.message);
        return;
      }
      const data = result.data;
      await mutation.mutateAsync({
        templateRepositoryUid: templateRepository?.uid || '',
        version: data.version,
        devboxReleaseName,
        description: data.description,
        tagUidList: data.tags.map(({ value }) => value)
      });

      queryClient.invalidateQueries(['template-repository-list']);
      form.reset();
      onClose();
      toast.success(t('update_template_success'));
    } catch (error) {
      toast.error(error as string);
    }
  };

  const onSubmit = (data: FormData) => {
    if (templateRepository.templates.findIndex((d) => data.version === d.name) > -1) {
      setShowOverview(true);
      return;
    }
    return submit(data);
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <Form {...form}>
            <DrawerHeader>
              <DrawerTitle>{t('update_template')}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-5 p-6">
              {/* name */}
              <NameField form={form} disabled />

              {/* version */}
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2 border-none bg-transparent p-0">
                    <FormLabel required className="text-sm">
                      {t('version')}
                    </FormLabel>
                    <FormControl>
                      <VersionSelect
                        templateList={templateRepository.templates}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* tags */}
              <TagsField form={form} />

              {/* description */}
              <DescriptionField form={form} />
            </div>
          </Form>
          <DrawerFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onClose();
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={() => {
                form.handleSubmit(onSubmit)();
              }}
            >
              {t('save_template')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <UpdateTemplateConfirmDialog
        open={showOverview}
        onClose={() => setShowOverview(false)}
        onSuccess={() => {
          submit(form.getValues());
        }}
        version={form.watch('version')}
        template={templateRepository.name}
      />
    </>
  );
};

const VersionSelect = ({
  templateList,
  value,
  onChange
}: {
  templateList: { uid: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const t = useTranslations();

  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  const handleVersionSelect = (version: string) => {
    onChange(version);
    setIsOpen(false);
  };

  const handleCreateVersion = () => {
    onChange(inputValue);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="h-10 w-full justify-between bg-white"
        >
          <span className="truncate">{value || t('select_version')}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-[335px] flex-col gap-2 p-2" align="start">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('search_or_add_version')}
          className="h-10"
        />
        <ScrollArea className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
          {templateList
            .filter((v) => v.name.toLowerCase().includes(inputValue.toLowerCase()))
            .map((v) => (
              <Button
                key={v.uid}
                variant="ghost"
                className="w-full justify-start font-normal text-zinc-950"
                onClick={() => handleVersionSelect(v.name)}
              >
                {v.name}
              </Button>
            ))}
          {inputValue && !templateList.find((v) => v.name === inputValue) && (
            <Button
              variant="ghost"
              className="w-full justify-start font-normal text-zinc-950"
              onClick={handleCreateVersion}
            >
              <Plus className="h-4 w-4" />
              {t('create_template_version', { version: inputValue })}
            </Button>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default UpdateTemplateDrawer;
