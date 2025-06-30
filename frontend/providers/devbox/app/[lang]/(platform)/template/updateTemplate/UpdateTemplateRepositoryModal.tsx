import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { FC, useEffect, useRef, useState } from 'react';
import { ChevronDown, PlusCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { updateTemplate } from '@/api/template';
import { versionSchema } from '@/utils/validate';

import OverviewTemplateVersionModal from '../updateTemplateVersion/OverviewTemplateVersionModal';
import TemplateRepositoryDescriptionField from './components/TemplateRepositoryDescriptionField';
import TemplateRepositoryNameField from './components/TemplateRepositoryNameField';
import TemplateRepositoryTagField from './components/TemplateRepositoryTagField';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';

interface CreateTemplateModalProps {
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

const VersionSelect = ({ templateList }: { templateList: { uid: string; name: string }[] }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { setValue, watch } = useForm();
  const inputRef = useRef<HTMLInputElement>(null);
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
          className="w-[350px] justify-between"
        >
          <span className="truncate">{watch('version')}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="p-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('search_or_add_version')}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[200px]">
          {templateList
            .filter((v) => v.name.toLowerCase().includes(inputValue.toLowerCase()))
            .map((v) => (
              <button
                key={v.uid}
                onClick={() => handleVersionSelect(v.name)}
                className={cn(
                  'w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  'cursor-pointer text-left'
                )}
              >
                {v.name}
              </button>
            ))}
          {inputValue && !templateList.find((v) => v.name === inputValue) && (
            <button
              onClick={handleCreateVersion}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                'cursor-pointer text-left'
              )}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('create_template_version', { version: inputValue })}
            </button>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const UpdateTemplateRepositoryModal: FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  templateRepository,
  devboxReleaseName
}) => {
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[562px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{t('update_template')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 px-[52px] py-8">
                {/* 名称 */}
                <TemplateRepositoryNameField isDisabled />

                {/* 版本号 */}
                <FormField
                  control={form.control}
                  name="version"
                  render={() => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="m-0 w-[108px] text-sm">{t('version')}</FormLabel>
                      <VersionSelect templateList={templateRepository.templates} />
                    </FormItem>
                  )}
                />

                {/* 标签 */}
                <TemplateRepositoryTagField />

                {/* 简介 */}
                <TemplateRepositoryDescriptionField />
              </div>
              <DialogFooter className="px-[52px] pb-8">
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {t('save_template')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <OverviewTemplateVersionModal
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        onSubmit={() => {
          submit(form.getValues());
        }}
        version={form.watch('version')}
        template={templateRepository.name}
      />
    </>
  );
};

export default UpdateTemplateRepositoryModal;
