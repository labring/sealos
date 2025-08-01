import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface NameFieldProps {
  form: UseFormReturn<any>;
  disabled?: boolean;
}

const NameField = ({ form, disabled = false }: NameFieldProps) => {
  const t = useTranslations();

  return (
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
              disabled={disabled}
              placeholder={t('input_template_name_placeholder')}
              className="h-10 bg-white"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default NameField;
