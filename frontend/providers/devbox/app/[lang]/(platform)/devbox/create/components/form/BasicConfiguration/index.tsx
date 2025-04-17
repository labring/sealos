import MyIcon from '@/components/Icon';
import { Box, BoxProps } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import CpuSelector from './CpuSelector';
import GpuSelector from './GpuSelector';
import MemorySelector from './MemorySelector';
import DevboxNameInput from './DevboxNameInput';
import TemplateSelector from './TemplateSelector';
import ConfigurationHeader from '../ConfigurationHeader';
import TemplateRepositorySelector from './TemplateRepositorySelector';

export default function BasicConfiguration({
  isEdit,
  countGpuInventory,
  ...props
}: BoxProps & { isEdit: boolean; countGpuInventory: (type: string) => number }) {
  const t = useTranslations();
  return (
    <Box {...props}>
      <ConfigurationHeader>
        <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'grayModern.600'} />
        {t('basic_configuration')}
      </ConfigurationHeader>
      <Box px={'42px'} py={'24px'}>
        {/* Devbox Name */}
        <DevboxNameInput isEdit={isEdit} />
        {/* Template Repository */}
        <TemplateRepositorySelector isEdit={isEdit} />
        {/* Runtime Version */}
        <TemplateSelector isEdit={isEdit} />
        {/* GPU */}
        <GpuSelector countGpuInventory={countGpuInventory} />
        {/* CPU */}
        <CpuSelector />
        {/* Memory */}
        <MemorySelector />
      </Box>
    </Box>
  );
}
