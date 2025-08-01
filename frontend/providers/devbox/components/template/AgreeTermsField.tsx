import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';

import { useEnvStore } from '@/stores/env';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

interface AgreeTermsFieldProps {
  form: UseFormReturn<any>;
}

const AgreeTermsField = ({ form }: AgreeTermsFieldProps) => {
  const t = useTranslations();
  const { env } = useEnvStore();

  return (
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
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default AgreeTermsField;
