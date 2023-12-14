import { FormSchema } from '@/consts';
import { json2Bucket } from '@/utils/json2Yaml';
import { downLoadBold } from '@/utils/tools';
import { Flex, IconButton, Button, Box } from '@chakra-ui/react';
import { format } from 'date-fns';
import JSZip from 'jszip';
import router from 'next/router';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import LeftArrowIcon from '../Icons/LeftArrowIcon';

const ConfigHeader = ({
  name,
  onBack = () => {
    router.replace('/');
  }
}: {
  name?: string;
  onBack?: () => void;
}) => {
  const { t } = useTranslation(['common', 'bucket']);
  const {
    formState: { isSubmitting },
    getValues
  } = useFormContext<FormSchema>();
  const handleExportYaml = async () => {
    const zip = new JSZip();
    const yamllist = json2Bucket(getValues());
    yamllist.forEach((item) => zip.file(item.filename, item.value));
    const res = await zip.generateAsync({ type: 'blob' });
    downLoadBold(
      res,
      'application/zip',
      name ? `${name}.zip` : `yaml-${format(new Date(), 'yyyy-MM-dd_HH_mm_ss')}.zip`
    );
  };

  return (
    <Flex w={'100%'} px={'32px'} py="24px" alignItems={'center'} justify={'space-between'}>
      <Flex alignItems={'center'} cursor={'pointer'} gap={'19px'}>
        <IconButton
          variant={'white-bg-icon'}
          icon={<LeftArrowIcon color={'grayModern.600'} w="24px" h="24px" />}
          p="6px"
          aria-label={'black'}
          onClick={() => onBack()}
        />
        <Box fontWeight={'500'} color={'grayModern.900'} fontSize={'20px'}>
          {t('bucket:bucketConfig')}
        </Box>
      </Flex>
      <Flex gap={'16px'}>
        <Button
          px="43px"
          py="10.5px"
          variant={'secondary'}
          isDisabled={isSubmitting}
          onClick={(e) => {
            e.preventDefault();
            handleExportYaml();
          }}
        >
          {t('export')} Yaml
        </Button>
        <Button px="43px" type="submit" py="10.5px" isDisabled={isSubmitting} variant={'primary'}>
          {t('application')}
        </Button>
      </Flex>
    </Flex>
  );
};
export default ConfigHeader;
