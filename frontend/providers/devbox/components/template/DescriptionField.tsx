import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';

import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface DescriptionFieldProps {
  form: UseFormReturn<any>;
}

const DescriptionField = ({ form }: DescriptionFieldProps) => {
  const t = useTranslations();

  return (
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
              className="min-h-16 w-[462px] bg-white placeholder:text-sm/5"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DescriptionField;
