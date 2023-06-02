import React, { useCallback } from 'react';
import { Box, Flex, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';
import JSZip from 'jszip';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import dayjs from 'dayjs';

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
  const router = useRouter();

  const handleExportYaml = useCallback(async () => {
    const zip = new JSZip();
    yamlList.forEach((item) => {
      zip.file(item.filename, item.value);
    });
    const res = await zip.generateAsync({ type: 'blob' });
    downLoadBold(
      res,
      'application/zip',
      appName ? `${appName}.zip` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`
    );
  }, [appName, yamlList]);

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.back()}>
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'black'} fontSize={'3xl'}>
          {title}
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
        导出 Yaml
      </Button>
      <Button flex={'0 0 140px'} h={'40px'} variant={'primary'} onClick={applyCb}>
        {applyBtnText}
      </Button>
    </Flex>
  );
};

export default Header;
