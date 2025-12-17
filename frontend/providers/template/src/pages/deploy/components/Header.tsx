import MyIcon from '@/components/Icon';
import { CopyLinkIcon, HomePageIcon, HtmlIcon, MdIcon, ShareIcon } from '@/components/icons';
import { TemplateType } from '@/types/app';
import type { YamlItemType } from '@/types/index';
import { downLoadBold, formatStarNumber, useCopyData } from '@/utils/tools';
import { getResourceUsage } from '@/utils/usage';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Center,
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
import { useGuideStore } from '@/store/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { X } from 'lucide-react';
import { startDriver, quitGuideDriverObj } from '@/hooks/driver';
import { track } from '@sealos/gtm';
import useSessionStore from '@/store/session';

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
  const { session } = useSessionStore();

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

  const link = useMemo(
    () =>
      `https://${cloudDomain}/?openapp=system-template%3FtemplateName%3D${appName}${
        session?.user?.id ? `&uid=${session?.user?.id}` : ''
      }`,
    [appName, cloudDomain, session]
  );

  const copyTemplateLink = useCallback(() => {
    copyData(link);
  }, [copyData, link]);

  const MdPart = `[![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](${link})`;
  const HtmlPart = `<a href="${link}"><img src="https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg" alt="Deploy on Sealos"/></a>`;

  const { createCompleted } = useGuideStore();
  const isClientSide = useClientSideValue();

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
      <Flex ml={'24px'} w="100%" flexDirection={'column'}>
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

      {session.subscription?.type === 'PAYG' && (
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
      )}

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
      <Box position={'relative'}>
        <Button
          px={4}
          className="driver-deploy-button"
          minW={'140px'}
          h={'40px'}
          onClick={applyCb}
          _focusVisible={{ boxShadow: '' }}
          outline={isClientSide && !createCompleted ? '1px solid #1C4EF5' : 'none'}
          outlineOffset={isClientSide && !createCompleted ? '2px' : '0'}
        >
          {t(applyBtnText)}
        </Button>
        {isClientSide && !createCompleted && (
          <Box
            zIndex={1000}
            position={'absolute'}
            top={'54px'}
            left={'-100%'}
            width={'250px'}
            bg={'#2563EB'}
            p={'16px'}
            borderRadius={'12px'}
            color={'#fff'}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text fontSize={'14px'} fontWeight={600}>
                {t('driver.configure_template')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  track('guide_exit', {
                    module: 'guide',
                    guide_name: 'appstore',
                    duration_seconds:
                      (Date.now() - (useGuideStore.getState().startTimeMs ?? Date.now())) / 1000,
                    progress_step: 3
                  });

                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text
              textAlign={'start'}
              whiteSpace={'wrap'}
              mt={'8px'}
              color={'#FFFFFFCC'}
              fontSize={'14px'}
              fontWeight={400}
            >
              {t('driver.define_template_settings')}
            </Text>
            <Flex mt={'16px'} justifyContent={'space-between'} alignItems={'center'}>
              <Text fontSize={'13px'} fontWeight={500}>
                3/4
              </Text>
              <Center
                w={'86px'}
                color={'#fff'}
                fontSize={'14px'}
                fontWeight={500}
                cursor={'pointer'}
                borderRadius={'8px'}
                background={'rgba(255, 255, 255, 0.20)'}
                h={'32px'}
                p={'px'}
                onClick={() => {
                  applyCb();
                }}
              >
                {t('driver.next')}
              </Center>
            </Flex>
            <Box
              position={'absolute'}
              top={'-10px'}
              right={'16px'}
              width={0}
              height={0}
              borderLeft={'8px solid transparent'}
              borderRight={'8px solid transparent'}
              borderTop={'10px solid #2563EB'}
              transform={'rotate(180deg)'}
            />
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default Header;
