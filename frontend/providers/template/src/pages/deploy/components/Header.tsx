import MyIcon from '@/components/Icon';
import { CopyLinkIcon, HomePageIcon, HtmlIcon, MdIcon, ShareIcon } from '@/components/icons';
import { TemplateType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold, formatStarNumber, useCopyData } from '@/utils/tools';
import { getResourceUsage } from '@/utils/usage';
import {
  Avatar,
  AvatarGroup,
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
import { nanoid } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useCallback, useMemo } from 'react';
import PriceBox, { usePriceCalculation } from './PriceBox';
import { CurrencySymbol } from '@sealos/ui';
import { useSystemConfigStore } from '@/store/config';

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
  const { t, i18n } = useTranslation();
  const { copyData } = useCopyData();
  const { envs } = useSystemConfigStore();

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList?.map((i) => i.value).join('---\n');
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

  const copyTemplateLink = useCallback(() => {
    const str = `https://${cloudDomain}/?openapp=system-template%3FtemplateName%3D${appName}`;
    copyData(str);
  }, [appName, cloudDomain, copyData]);

  const MdPart = `[![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://${cloudDomain}/?openapp=system-template%3FtemplateName%3D${appName})`;

  const HtmlPart = `<a href="https://${cloudDomain}/?openapp=system-template%3FtemplateName%3D${appName}"><img src="https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg" alt="Deploy on Sealos"/></a>`;

  const DeployCountComponent = useMemo(() => {
    return (
      <>
        {templateDetail?.spec?.deployCount && templateDetail?.spec?.deployCount > 6 && (
          <Tooltip
            label={t('users installed the app', { count: templateDetail.spec.deployCount })}
            hasArrow
            bg="#FFF"
          >
            <Flex gap={'6px'} cursor={'pointer'}>
              <AvatarGroup size={'xs'} max={3}>
                <Avatar name={nanoid(6)} />
                <Avatar name={nanoid(6)} />
                <Avatar name={nanoid(6)} />
              </AvatarGroup>
              <Text>+{formatStarNumber(templateDetail.spec.deployCount)}</Text>
            </Flex>
          </Tooltip>
        )}
      </>
    );
  }, [t, templateDetail?.spec?.deployCount]);

  const usage = useMemo(() => {
    const usage = getResourceUsage(yamlList?.map((item) => item.value) || []);
    return usage;
  }, [yamlList]);

  const priceList = usePriceCalculation(usage);

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
        <Image
          src={templateDetail?.spec?.i18n?.[i18n.language]?.icon ?? templateDetail?.spec?.icon}
          alt=""
          width={'60px'}
          height={'60px'}
        />
      </Flex>
      <Flex ml={'24px'} w="520px" flexDirection={'column'}>
        <Flex alignItems={'center'} gap={'12px'}>
          <Text fontSize={'24px'} fontWeight={600} color={'#24282C'}>
            {templateDetail?.spec?.i18n?.[i18n.language]?.title ?? templateDetail?.spec?.title}
          </Text>
          {DeployCountComponent}
          <Flex
            cursor={'pointer'}
            p="6px"
            borderRadius={'4px'}
            alignItems={'center'}
            _hover={{
              background: '#F4F6F8'
            }}
            onClick={(e) =>
              goGithub(
                e,
                templateDetail?.spec?.i18n?.[i18n.language]?.gitRepo ??
                  templateDetail?.spec?.gitRepo
              )
            }
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
            <PopoverContent
              w="208px"
              border={'none'}
              boxShadow={
                '0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)'
              }
            >
              <PopoverBody p={'20px'}>
                <Flex
                  onClick={copyTemplateLink}
                  flexDirection={'column'}
                  justifyContent={'center'}
                  alignItems={'start'}
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

        <Tooltip
          label={
            templateDetail?.spec?.i18n?.[i18n.language]?.description ??
            templateDetail?.spec?.description
          }
          closeDelay={200}
        >
          <Text
            overflow={'hidden'}
            noOfLines={1}
            textOverflow={'ellipsis'}
            mt={'8px'}
            fontSize={'12px'}
            color={'5A646E'}
            fontWeight={400}
            onClick={() =>
              copyData(
                templateDetail?.spec?.i18n?.[i18n.language]?.description ??
                  templateDetail?.spec?.description
              )
            }
          >
            {templateDetail?.spec?.i18n?.[i18n.language]?.description ??
              templateDetail?.spec?.description}
          </Text>
        </Tooltip>
      </Flex>
      <Popover trigger="hover" closeDelay={600}>
        <PopoverTrigger>
          <Flex
            cursor={'pointer'}
            ml={'auto'}
            alignItems={'center'}
            color={'brightBlue.600'}
            fontSize={'20px'}
            fontWeight={'bold'}
            flexShrink={'0'}
            gap={'4px'}
          >
            <CurrencySymbol type={envs?.CURRENCY_SYMBOL} />
            {priceList?.[priceList.length - 1]?.value}
            <Text fontSize={'16px'}>/{t('Day')}</Text>
            <MyIcon name="help" width={'16px'} height={'16px'} color={'grayModern.500'}></MyIcon>
          </Flex>
        </PopoverTrigger>
        <PopoverContent
          width={'205px'}
          borderRadius={'8px'}
          boxShadow={
            '0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)'
          }
          border={'none'}
        >
          <PriceBox {...usage} />
        </PopoverContent>
      </Popover>

      <Button
        h={'40px'}
        mr={'12px'}
        ml={'20px'}
        px={4}
        minW={'120px'}
        variant={'unstyled'}
        bg={'grayModern.150'}
        color={'grayModern.900'}
        onClick={handleExportYaml}
      >
        {t('Export')} Yaml
      </Button>
      <Button px={4} minW={'120px'} h={'40px'} variant={'solid'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
