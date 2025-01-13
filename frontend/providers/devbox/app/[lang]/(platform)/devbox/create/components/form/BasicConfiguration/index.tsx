import MyIcon from '@/components/Icon';
import { Box, BoxProps } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import ConfigurationHeader from '../ConfigurationHeader';
import CpuSelector from './CpuSelector';
import DevboxNameInput from './DevboxNameInput';
import MemorySelector from './MemorySelector';
import TemplateRepositorySelector from './TemplateRepositorySelector';
import TemplateSelector from './TemplateSelector';

export default function BasicConfiguration({ isEdit, ...props }: BoxProps & { isEdit: boolean }) {
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

        <Box className="guide-custom-resources" pb={'2px'}>
          {/* CPU */}
          <CpuSelector />
          {/* Memory */}
          <MemorySelector />
        </Box>
      </Box>
    </Box>
  );
}
