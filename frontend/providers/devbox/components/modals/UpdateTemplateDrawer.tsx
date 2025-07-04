import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { versionSchema } from '@/utils/validate';
import { updateTemplate, listTag } from '@/api/template';
import { Tag, TagType } from '@/prisma/generated/client';

import UpdateTemplateConfirmModal from './UpdateTemplateConfirmModal';

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      console.log('test');
      setShowOverview(true);
      return;
    }
    console.log('test2');
    return submit(data);
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="w-[450px]">
          <Form {...form}>
            <DrawerHeader>
              <DrawerTitle>{t('update_template')}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-5 p-6">
              {/* name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2 border-none bg-transparent p-0">
                    <FormLabel required className="text-sm">
                      {t('name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        placeholder={t('input_template_name_placeholder')}
                        className="h-10 bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      <VersionSelect templateList={templateRepository.templates} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2 border-none bg-transparent p-0">
                    <FormLabel required className="text-sm">
                      {t('tags')}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value.map((v) => v.value).join(',')}
                        onValueChange={(value) => {
                          const selectedTag = value.split(',').filter(Boolean);
                          field.onChange(selectedTag.map((uid) => ({ value: uid })));
                        }}
                      >
                        <SelectTrigger className="min-h-10 w-full">
                          <SelectValue className="flex flex-wrap gap-2">
                            {field.value.map((t) => {
                              const tag = [
                                ...tagListCollection[TagType.USE_CASE],
                                ...tagListCollection[TagType.PROGRAMMING_LANGUAGE]
                              ].find((tag) => tag.uid === t.value);
                              return tag ? (
                                <div
                                  key={tag.uid}
                                  className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5"
                                >
                                  <span className="text-xs/4 font-semibold text-zinc-900">
                                    {tag.name}
                                  </span>
                                </div>
                              ) : null;
                            })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="py-2">
                          {/* use case */}
                          <div className="flex w-full items-center gap-2.5 px-2 py-1.5">
                            <span className="text-xs/4 font-medium text-zinc-500">
                              {t('use_case')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 px-4 py-3">
                            {tagListCollection[TagType.USE_CASE].map((tag) => {
                              const isSelected = field.value.some((t) => t.value === tag.uid);
                              return (
                                <div
                                  key={tag.uid}
                                  className="flex cursor-pointer items-center gap-3 px-2 py-1.5"
                                  onClick={() => {
                                    const newValue = isSelected
                                      ? field.value.filter((t) => t.value !== tag.uid)
                                      : [...field.value, { value: tag.uid }];
                                    if (!isSelected && newValue.length > 3) return;
                                    field.onChange(newValue);
                                  }}
                                >
                                  <Checkbox checked={isSelected} />
                                  <span className="text-sm text-zinc-900">{tag.name}</span>
                                </div>
                              );
                            })}
                          </div>
                          <Separator />
                          {/* Language */}
                          <div className="flex w-full items-center gap-2.5 px-2 py-1.5">
                            <span className="text-xs/4 font-medium text-zinc-500">
                              {t('programming_language')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 px-4 py-3">
                            {tagListCollection[TagType.PROGRAMMING_LANGUAGE].map((tag) => {
                              const isSelected = field.value.some((t) => t.value === tag.uid);
                              return (
                                <div
                                  key={tag.uid}
                                  className="flex cursor-pointer items-center gap-3 px-2 py-1.5"
                                  onClick={() => {
                                    const newValue = isSelected
                                      ? field.value.filter((t) => t.value !== tag.uid)
                                      : [...field.value, { value: tag.uid }];
                                    if (!isSelected && newValue.length > 3) return;
                                    field.onChange(newValue);
                                  }}
                                >
                                  <Checkbox checked={isSelected} />
                                  <span className="text-sm">{tag.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <span className="text-sm/5 font-normal text-zinc-500">
                      {t('select_tag_tips')}
                    </span>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2 border-none bg-transparent p-0">
                    <FormLabel className="text-sm">{t('template_description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('template_description_placeholder')}
                        className="min-h-16 bg-white placeholder:text-sm/5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                console.log('test3');
                form.handleSubmit(onSubmit)();
              }}
            >
              {t('save_template')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <UpdateTemplateConfirmModal
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

const VersionSelect = ({ templateList }: { templateList: { uid: string; name: string }[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const { setValue, watch } = useForm();
  const t = useTranslations();

  const handleVersionSelect = (version: string) => {
    setInputValue(version);
    setValue('version', version);
    setIsOpen(false);
  };

  const handleCreateVersion = () => {
    setValue('version', inputValue);
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
          <span className="truncate">{watch('version')}</span>
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
