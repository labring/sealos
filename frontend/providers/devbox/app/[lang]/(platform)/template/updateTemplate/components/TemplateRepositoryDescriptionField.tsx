import MyFormLabel from '@/components/MyFormControl';
import { Flex, Textarea } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { Controller, useFormContext } from 'react-hook-form';
export default function TemplateRepositoryDescriptionField() {
  const { control } = useFormContext<{ description: string }>();
  const t = useTranslations();
  return (
    <Flex align={'center'}>
      <MyFormLabel width="108px" m="0" fontSize="14px">
        {t('template_description')}
      </MyFormLabel>
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            placeholder={t('template_description_placeholder')}
            bg="grayModern.50"
            borderColor="grayModern.200"
            color={'grayModern.500'}
            fontSize={'12px'}
            resize="vertical"
            minH="106px"
            width={'350px'}
          />
        )}
      />
    </Flex>
  );
}
