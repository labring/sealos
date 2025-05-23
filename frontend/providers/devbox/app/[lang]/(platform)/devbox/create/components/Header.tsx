import { Box, Button, Center, Flex, Text } from '@chakra-ui/react';
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
import { useGuideStore } from '@/stores/guide';
import { Info, X } from 'lucide-react';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { quitGuideDriverObj, startDriver } from '@/hooks/driver';

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

  const { guideConfigDevbox } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  return (
    <>
      {!guideConfigDevbox && isClientSide && (
        <Center
          borderTop={'1px solid #BFDBFE'}
          borderBottom={'1px solid #BFDBFE'}
          bg={'#EFF6FF'}
          h={'56px'}
          w={'100%'}
          fontSize={'16px'}
          fontWeight={500}
          color={'#2563EB'}
          gap={'12px'}
        >
          <Info size={16} />
          {t('driver.create_app_header')}
        </Center>
      )}
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
        <Box position={'relative'}>
          <Button
            className="driver-deploy-button"
            minW={'140px'}
            h={'40px'}
            onClick={applyCb}
            _focusVisible={{ boxShadow: '' }}
            outline={isClientSide && !guideConfigDevbox ? '1px solid #1C4EF5' : 'none'}
            outlineOffset={isClientSide && !guideConfigDevbox ? '2px' : '0'}
          >
            {t(applyBtnText)}
          </Button>

          {isClientSide && !guideConfigDevbox && (
            <Box
              top={'54px'}
              right={'35%'}
              zIndex={1000}
              position={'absolute'}
              width={'250px'}
              bg={'#2563EB'}
              p={'16px'}
              borderRadius={'12px'}
              color={'#fff'}
            >
              <Flex alignItems={'center'} justifyContent={'space-between'}>
                <Text fontSize={'14px'} fontWeight={600}>
                  {t('driver.configure_devbox')}
                </Text>
                <Box
                  cursor={'pointer'}
                  ml={'auto'}
                  onClick={() => {
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
                {t('driver.adjust_resources_as_needed')}
              </Text>
              <Flex mt={'16px'} justifyContent={'space-between'} alignItems={'center'}>
                <Text fontSize={'13px'} fontWeight={500}>
                  3/5
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
    </>
  );
};

export default Header;
