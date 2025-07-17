import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

interface IsPublicFieldProps {
  form: UseFormReturn<any>;
}
// TODO: add FormMessage to every form field
const IsPublicField = ({ form }: IsPublicFieldProps) => {
  const t = useTranslations();

  return (
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
              </div>
            </FormControl>
          </div>
          <span className="text-sm/5 font-normal text-zinc-500">
            {t('set_template_to_public_tips')}
          </span>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default IsPublicField;
