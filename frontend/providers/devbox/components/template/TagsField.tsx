import { useTranslations, useLocale } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { listTag } from '@/api/template';
import { Tag, TagType } from '@/prisma/generated/client';

import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TagsFieldProps {
  form: UseFormReturn<any>;
}

const TagsField = ({ form }: TagsFieldProps) => {
  const t = useTranslations();
  const locale = useLocale();

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

  return (
    <FormField
      control={form.control}
      name="tags"
      render={({ field }) => (
        <FormItem className="flex w-full flex-col gap-2 border-none bg-transparent p-0">
          <FormLabel required className="text-sm">
            {t('tags')}
          </FormLabel>
          <FormControl>
            <Select value="placeholder" onValueChange={() => {}}>
              <SelectTrigger className="min-h-10 w-full">
                <SelectValue className="flex flex-wrap gap-2">
                  {field.value.map((t: { value: string }) => {
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
                          {locale === 'zh' ? tag.zhName : tag.enName}
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
                    const isSelected = field.value.some(
                      (t: { value: string }) => t.value === tag.uid
                    );
                    return (
                      <div
                        key={tag.uid}
                        className="flex cursor-pointer items-center gap-3 px-2 py-1.5"
                        onClick={() => {
                          const newValue = isSelected
                            ? field.value.filter((t: { value: string }) => t.value !== tag.uid)
                            : [...field.value, { value: tag.uid }];
                          if (!isSelected && newValue.length > 3) return;
                          field.onChange(newValue);
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <span className="text-sm text-zinc-900">
                          {locale === 'zh' ? tag.zhName : tag.enName}
                        </span>
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
                    const isSelected = field.value.some(
                      (t: { value: string }) => t.value === tag.uid
                    );
                    return (
                      <div
                        key={tag.uid}
                        className="flex h-fit cursor-pointer items-center gap-3 px-2 py-1.5"
                        onClick={() => {
                          const newValue = isSelected
                            ? field.value.filter((t: { value: string }) => t.value !== tag.uid)
                            : [...field.value, { value: tag.uid }];
                          if (!isSelected && newValue.length > 3) return;
                          field.onChange(newValue);
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <span className="text-sm">{locale === 'zh' ? tag.zhName : tag.enName}</span>
                      </div>
                    );
                  })}
                </div>
              </SelectContent>
            </Select>
          </FormControl>
          <span className="text-sm/5 font-normal text-zinc-500">{t('select_tag_tips')}</span>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TagsField;
