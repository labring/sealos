import React, { useCallback } from 'react';
import { Box, Flex, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';
import JSZip from 'jszip';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import dayjs from 'dayjs';
import { useGlobalStore } from '@/store/global';
import { useTranslation } from 'next-i18next';
import { I18nCommonKey } from '@/types/i18next';

const Header = ({
  dbName,
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  dbName: string;
  title: I18nCommonKey;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: I18nCommonKey;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();

  const handleExportYaml = useCallback(async () => {
    const zip = new JSZip();
    yamlList.forEach((item) => {
      zip.file(item.filename, item.value);
    });
    const res = await zip.generateAsync({ type: 'blob' });
    downLoadBold(
      res,
      'application/zip',
      dbName ? `${dbName}.zip` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`
    );
  }, [dbName, yamlList]);

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace(lastRoute)}>
        <MyIcon name="arrowLeft" width={'24px'} height={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button h={'40px'} flex={'0 0 114px'} mr={5} variant={'outline'} onClick={handleExportYaml}>
        {t('Export')} Yaml
      </Button>
      <Button flex={'0 0 114px'} h={'40px'} variant={'solid'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
