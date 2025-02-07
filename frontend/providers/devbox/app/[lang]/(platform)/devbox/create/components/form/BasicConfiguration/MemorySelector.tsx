import { MemorySlideMarkList } from '@/constants/devbox';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { Flex, FlexProps } from '@chakra-ui/react';
import { MySlider } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import Label from '../Label';

export default function MemorySelector(props: FlexProps) {
  const t = useTranslations();
  const { watch, setValue } = useFormContext<DevboxEditTypeV2>();
  return (
    <Flex mb={'50px'} pr={3} alignItems={'center'} {...props}>
      <Label w={100}>{t('memory')}</Label>
      <MySlider
        markList={MemorySlideMarkList}
        activeVal={watch('memory')}
        setVal={(e) => {
          setValue('memory', MemorySlideMarkList[e].value);
        }}
        max={MemorySlideMarkList.length - 1}
        min={0}
        step={1}
      />
    </Flex>
  );
}
