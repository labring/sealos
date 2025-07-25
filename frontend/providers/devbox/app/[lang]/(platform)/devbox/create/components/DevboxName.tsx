import { useTranslations } from 'next-intl';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { nanoid } from '@/utils/tools';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { devboxNameSchema } from '@/utils/validate';

import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function DevboxName({ isEdit }: { isEdit: boolean }) {
  const t = useTranslations();
  const { control, trigger } = useFormContext<DevboxEditTypeV2>();
  const { fields: networks, update: updateNetworks } = useFieldArray({
    control,
    name: 'networks'
  });

  return (
    <FormField
      control={control}
      name="name"
      rules={{
        required: t('devbox_name_required'),
        maxLength: {
          value: 63,
          message: t('devbox_name_max_length')
        },
        validate: {
          pattern: (value) => devboxNameSchema.safeParse(value).success || t('devbox_name_invalid')
        }
      }}
      render={({ field }) => (
        <FormItem className="min-w-[700px]">
          <FormLabel>{t('devbox_name')}</FormLabel>
          <FormControl>
            <Input
              {...field}
              className="h-10 w-[400px]"
              disabled={isEdit}
              autoFocus={true}
              placeholder={t('enter_devbox_name')}
              onBlur={async (e) => {
                const lowercaseValue = e.target.value.toLowerCase();
                field.onChange(lowercaseValue);
                networks.forEach((network, i) => {
                  updateNetworks(i, {
                    ...network,
                    networkName: `${lowercaseValue}-${nanoid()}`
                  });
                });
                await trigger('name');
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
