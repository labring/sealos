import MyIcon from '@/components/Icon';
import { TemplateType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import { Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useCallback } from 'react';

const Header = ({
  appName,
  title,
  yamlList,
  applyCb,
  applyBtnText,
  templateDetail
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
  templateDetail: TemplateType;
}) => {
  const { t } = useTranslation();

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

  const goGithub = (e: MouseEvent<HTMLDivElement>, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return (
    <Flex
      w={{ md: '1000px', base: '800px' }}
      m={'0 auto'}
      h={'80px'}
      mt={'32px'}
      alignItems={'center'}
      backgroundColor={'rgba(255, 255, 255, 0.90)'}
    >
      <Flex
        flexShrink={0}
        alignItems={'center'}
        justifyContent={'center'}
        w={'80px'}
        h={'80px'}
        borderRadius={'8px'}
        backgroundColor={'#fff'}
        border={' 1px solid #DEE0E2'}
      >
        <Image src={templateDetail?.spec?.icon} alt="" width={'60px'} height={'60px'} />
      </Flex>
      <Flex ml={'24px'} w="520px" flexDirection={'column'}>
        <Flex alignItems={'center'}>
          <Text fontSize={'24px'} fontWeight={600} color={'#24282C'}>
            {templateDetail?.spec?.title}
          </Text>
          <Box cursor={'pointer'} onClick={(e) => goGithub(e, templateDetail?.spec?.github)}>
            <MyIcon ml={'16px'} name="jump"></MyIcon>
          </Box>
          <Text ml={'16px'} fontSize={'12px'} color={'5A646E'} fontWeight={400}>
            By {templateDetail?.spec?.author}
          </Text>
        </Flex>
        <Text
          overflow={'hidden'}
          noOfLines={1}
          textOverflow={'ellipsis'}
          mt={'8px'}
          fontSize={'12px'}
          color={'5A646E'}
          fontWeight={400}
        >
          {templateDetail?.spec?.description}
        </Text>
      </Flex>

      <Button
        h={'40px'}
        ml={'auto'}
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
