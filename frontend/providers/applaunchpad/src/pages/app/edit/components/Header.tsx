import { exportApp } from '@/api/app';
import MyIcon from '@/components/Icon';
import { useGlobalStore } from '@/store/global';
import { AppEditType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import { Box, Button, Flex } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

const Header = ({
  appName,
  title,
  yamlList,
  applyCb,
  applyBtnText,
  namespace,
  formHook
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
  namespace: string;
  formHook: UseFormReturn<AppEditType, any, undefined>;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      appName ? `${appName}.yaml` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [appName, yamlList]);

  const handleExportApp = async () => {
    const images = formHook.getValues().containers.map((item) => ({ name: item.imageName }));
    try {
      const exportYamlString = yamlList.map((i) => i.value).join('---\n');
      await exportApp({
        yaml: exportYamlString,
        images: images,
        appName: appName,
        namespace: namespace
      });
    } catch (error) {}
  };

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        gap={'6px'}
        onClick={() => router.replace(lastRoute)}
      >
        <MyIcon name="arrowLeft" w={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button h={'40px'} mr={'14px'} minW={'140px'} variant={'outline'} onClick={handleExportApp}>
        {t('Export')} App
      </Button>

      <Button h={'40px'} mr={'14px'} minW={'140px'} variant={'outline'} onClick={handleExportYaml}>
        {t('Export')} Yaml
      </Button>
      <Button
        className="driver-deploy-button"
        minW={'140px'}
        h={'40px'}
        onClick={applyCb}
        _focusVisible={{ boxShadow: '' }}
      >
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
