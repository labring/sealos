import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRouter } from '@/i18n';
import { createTemplateRepository, listTag } from '@/api/template';
import { templateNameSchema, versionSchema } from '@/utils/validate';
import { useEnvStore } from '@/stores/env';
import { useQuery } from '@tanstack/react-query';
import { Tag, TagType } from '@/prisma/generated/client';
import { InfoCircleIcon } from '@sealos/ui';

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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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
  const { env } = useEnvStore();

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
      <DrawerContent className="w-[450px]">
        <DrawerHeader>
          <DrawerTitle>{t('create_template')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-5 p-6">
          <Form {...form}>
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
                    <Input
                      {...field}
                      placeholder={t('input_template_version_placeholder')}
                      className="h-10 bg-white"
                    />
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
                        <span className="text-xs/4 font-medium text-zinc-500">{t('use_case')}</span>
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

            {/* isPublic */}
            <div className="flex flex-col items-center gap-3">
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex w-full gap-3 border-none bg-transparent p-0">
                    <div className="flex items-center gap-5">
                      <FormLabel required className="text-sm">
                        {t('public')}
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          <span className="text-sm text-zinc-900">
                            {field.value ? t('enabled') : t('disabled')}
                          </span>
                        </div>
                      </FormControl>
                    </div>
                    <span className="text-sm/5 font-normal text-zinc-500">
                      {t('set_template_to_public_tips')}
                    </span>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex w-full gap-3 border-none bg-transparent p-0">
                    <FormControl>
                      <div className="flex gap-3">
                        <div className="pt-0.5">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                        <span className="text-sm font-medium text-zinc-900">
                          {t('have_read_and_agree_to_the ')}
                          <a
                            className="underline"
                            href={env.privacyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('privacy_and_security_agreement')}
                          </a>
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
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
