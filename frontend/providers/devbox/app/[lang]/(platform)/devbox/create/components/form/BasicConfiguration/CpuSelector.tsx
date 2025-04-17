import { CpuSlideMarkList } from '@/constants/devbox';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { Box, Flex, FlexProps } from '@chakra-ui/react';
import { MySlider } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import Label from '../Label';

export default function CpuSelector(props: FlexProps) {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();
  return (
    <Flex mb={10} pr={3} alignItems={'flex-start'} {...props}>
      <Label w={100}>{t('cpu')}</Label>
      <MySlider
        markList={CpuSlideMarkList}
        activeVal={watch('cpu')}
        setVal={(e) => {
          setValue('cpu', CpuSlideMarkList[e].value);
        }}
        max={CpuSlideMarkList.length - 1}
        min={0}
        step={1}
      />
      <Box ml={5} transform={'translateY(10px)'} color={'grayModern.600'}>
        {t('core')}
      </Box>
    </Flex>
  );
}
