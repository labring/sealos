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

const Header = ({
  name,
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  name: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
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
      name ? `${name}.zip` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`
    );
  }, [name, yamlList]);

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace(lastRoute)}>
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'black'} fontSize={'3xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button
        h={'40px'}
        flex={'0 0 140px'}
        mr={5}
        bg={'myWhite.600'}
        borderColor={'myGray.200'}
        variant={'base'}
        onClick={handleExportYaml}
      >
        {t('Export')} Yaml
      </Button>
      <Button flex={'0 0 140px'} h={'40px'} variant={'primary'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
