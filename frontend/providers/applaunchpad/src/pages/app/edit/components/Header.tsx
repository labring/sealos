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
  appName,
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
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
        mr={5}
        px={4}
        minW={'140px'}
        bg={'myWhite.600'}
        borderColor={'myGray.200'}
        variant={'base'}
        onClick={handleExportYaml}
      >
        {t('Export')} Yaml
      </Button>
      <Button px={4} minW={'140px'} h={'40px'} variant={'primary'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
