import { Box, Button, Flex } from '@chakra-ui/react';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import MyIcon from '@/components/Icon';
import { useRouter } from '@/i18n';
import { useEnvStore } from '@/stores/env';
import { useGlobalStore } from '@/stores/global';
import { useTemplateStore } from '@/stores/template';
import type { YamlItemType } from '@/types/index';
import { downLoadBlob } from '@/utils/tools';

const Header = ({
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  yamlList: YamlItemType[];
  applyCb: () => void;
  title: string;
  applyBtnText: string;
}) => {
  const router = useRouter();
  const { lastRoute } = useGlobalStore();
  const t = useTranslations();
  const { config } = useTemplateStore();
  const { env } = useEnvStore();
  const handleExportYaml = useCallback(async () => {
    const zip = new JSZip();
    yamlList.forEach((item) => {
      zip.file(item.filename, item.value);
    });
    const res = await zip.generateAsync({ type: 'blob' });
    downLoadBlob(res, 'application/zip', `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`);
  }, [yamlList]);
  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        onClick={() => {
          if (config.lastRoute) {
            router.replace(lastRoute);
          } else {
            router.replace(lastRoute);
          }
        }}
      >
        <MyIcon name="arrowLeft" width={'24px'} height={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button h={'40px'} flex={'0 0 114px'} mr={5} variant={'outline'} onClick={handleExportYaml}>
        {t('export_yaml')}
      </Button>
      <Button flex={'0 0 114px'} h={'40px'} variant={'solid'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
