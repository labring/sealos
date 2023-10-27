import { CopyLinkIcon, HomePageIcon, HtmlIcon, MdIcon, ShareIcon } from '@/components/icons';
import { TemplateType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold, useCopyData } from '@/utils/tools';
import {
  Box,
  Button,
  Divider,
  Flex,
  FlexProps,
  Image,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Tooltip
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useCallback, useMemo } from 'react';

const MdPart = `![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-fastdeploy%3FtemplateName%3Dfastgpt`;

const HtmlPart = `<a href="https://cloud.sealos.io/?openapp=system-fastdeploy%3FtemplateName%3Dfastgpt"><img src="https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg" alt="Deploy on Sealos"/></a>`;

const Header = ({
  appName,
  title,
  yamlList,
  applyCb,
  applyBtnText,
  templateDetail,
  cloudDomain
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  applyCb: () => void;
  applyBtnText: string;
  templateDetail: TemplateType;
  cloudDomain: string;
}) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      appName ? `${appName}.yaml` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [appName, yamlList]);

  const goGithub = (e: MouseEvent<HTMLDivElement>, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  const IconBox: FlexProps = {
    w: '32px',
    h: '32px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: '#F4F6F8',
    cursor: 'pointer'
  };

  const copyTemplateLink = () => {
    const str = `https://${cloudDomain}/?openapp=system-fastdeploy%3FtemplateName%3D${appName}`;
    copyData(str);
  };

  return (
    <Flex w={'100%'} h={'80px'} alignItems={'center'} backgroundColor={'rgba(255, 255, 255, 0.90)'}>
      <Flex
        boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
        flexShrink={0}
        alignItems={'center'}
        justifyContent={'center'}
        w={'80px'}
        h={'80px'}
        borderRadius={'8px'}
        backgroundColor={'#FBFBFC'}
        border={' 1px solid rgba(255, 255, 255, 0.50)'}
      >
        <Image src={templateDetail?.spec?.icon} alt="" width={'60px'} height={'60px'} />
      </Flex>
      <Flex ml={'24px'} w="520px" flexDirection={'column'}>
        <Flex alignItems={'center'}>
          <Text fontSize={'24px'} fontWeight={600} color={'#24282C'}>
            {templateDetail?.spec?.title}
          </Text>
          <Flex
            cursor={'pointer'}
            ml="12px"
            p="6px"
            borderRadius={'4px'}
            alignItems={'center'}
            _hover={{
              background: '#F4F6F8'
            }}
            onClick={(e) => goGithub(e, templateDetail?.spec?.gitRepo)}
          >
            <HomePageIcon />
            <Text fontSize={'12px '} fontWeight={400} pl="6px">
              {t('Home Page')}
            </Text>
          </Flex>

          <Popover trigger="hover">
            <PopoverTrigger>
              <Flex
                cursor={'pointer'}
                ml="12px"
                p="6px"
                borderRadius={'4px'}
                alignItems={'center'}
                _hover={{
                  background: '#F4F6F8'
                }}
              >
                <ShareIcon />
                <Text fontSize={'12px '} fontWeight={400} color={'#485058'} pl="6px">
                  {t('Share')}
                </Text>
              </Flex>
            </PopoverTrigger>
            <PopoverContent w="208px">
              <PopoverArrow />
              <PopoverBody p={'20px'}>
                <Flex
                  onClick={copyTemplateLink}
                  w="60px"
                  flexDirection={'column'}
                  justifyContent={'center'}
                  alignItems={'center'}
                >
                  <Flex {...IconBox}>
                    <CopyLinkIcon />
                  </Flex>
                  <Text mt="8px" fontSize={'12px '} fontWeight={400} color={'#485058'}>
                    {t('Share Link')}
                  </Text>
                </Flex>
                <Divider my="16px" />
                <Text fontSize={'12px '} fontWeight={500} color={'#485058'}>
                  {t('One click deploy button')}
                </Text>
                <Flex mt="16px">
                  <Flex
                    flexDirection={'column'}
                    alignItems={'center'}
                    onClick={() => copyData(HtmlPart)}
                  >
                    <Flex {...IconBox}>
                      <HtmlIcon />
                    </Flex>
                    <Text mt="8px" fontSize={'12px '} fontWeight={400} color={'#485058'}>
                      {t('Html Part')}
                    </Text>
                  </Flex>
                  <Flex
                    flexDirection={'column'}
                    alignItems={'center'}
                    ml="auto"
                    onClick={() => copyData(MdPart)}
                  >
                    <Flex {...IconBox}>
                      <MdIcon />
                    </Flex>
                    <Text mt="8px" fontSize={'12px '} fontWeight={400} color={'#485058'}>
                      {t('Markdown Part')}
                    </Text>
                  </Flex>
                </Flex>
                <Text mt="16px" fontSize={'12px '} fontWeight={500} color={'#485058'}>
                  {t('Button Effect')}
                </Text>
                <Image mt="4px" alt="Button effect" src="/images/ButtonEffect.svg" />
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>

        <Tooltip label={templateDetail?.spec?.description} closeDelay={200}>
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
        </Tooltip>
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
