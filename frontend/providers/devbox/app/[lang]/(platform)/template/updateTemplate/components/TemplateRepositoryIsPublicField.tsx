import { useEnvStore } from '@/stores/env';
import { useTranslations } from 'next-intl';
import { Controller, useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoCircleIcon } from '@sealos/ui';

export default function TemplateRepositoryIsPublicField({
  isDisabled = false
}: {
  isDisabled?: boolean;
}) {
  const { control } = useFormContext();
  const t = useTranslations();
  const { env } = useEnvStore();

  return (
    <div className="flex">
      <Label className="m-0 w-[108px] text-sm font-medium" htmlFor="isPublic">
        {t('public')}
        <span className="text-red-500">*</span>
      </Label>
      <div className="flex flex-1 flex-col gap-3">
        <Controller
          name="isPublic"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Switch
              id="isPublic"
              checked={value}
              onCheckedChange={onChange}
              disabled={isDisabled}
            />
          )}
        />

        <div className="flex items-center rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-600">
          <InfoCircleIcon fill="currentcolor" className="mr-1 h-3.5 w-3.5" />
          <p className="text-xs font-medium">{t('set_template_to_public_tips')}</p>
        </div>

        {!isDisabled && (
          <div>
            <Controller
              name="agreeTerms"
              control={control}
              render={({ field: { value, onChange, onBlur } }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeTerms"
                    checked={value}
                    onCheckedChange={onChange}
                    onBlur={onBlur}
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="cursor-pointer text-xs font-medium text-gray-600"
                  >
                    {t('have_read_and_agree_to_the ')}
                    <a
                      className="text-blue-600 underline"
                      href={env.privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('privacy_and_security_agreement')}
                    </a>
                  </label>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
