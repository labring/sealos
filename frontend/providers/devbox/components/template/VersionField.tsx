import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface VersionFieldProps {
  form: UseFormReturn<any>;
}

const VersionField = ({ form }: VersionFieldProps) => {
  const t = useTranslations();

  return (
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
  );
};

export default VersionField;
