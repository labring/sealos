import { Box, BoxProps } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import CpuSelector from './CpuSelector';
import GpuSelector from './GpuSelector';
import MemorySelector from './MemorySelector';
import DevboxNameInput from './DevboxNameInput';
import TemplateSelector from './TemplateSelector';
import TemplateRepositorySelector from './TemplateRepositorySelector';

export default function BasicConfiguration({
  isEdit,
  countGpuInventory,
  ...props
}: BoxProps & { isEdit: boolean; countGpuInventory: (type: string) => number }) {
  const t = useTranslations();
  return (
    <Box {...props}>
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
