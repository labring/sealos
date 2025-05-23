import MyIcon from '@/components/Icon';
import { quitGuideDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useGlobalStore } from '@/store/global';
import { useGuideStore } from '@/store/guide';
import type { YamlItemType } from '@/types/index';
import { downLoadBold } from '@/utils/tools';
import { Box, Button, Center, Flex, Text } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

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
  const isClientSide = useClientSideValue(true);

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      appName ? `${appName}.yaml` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [appName, yamlList]);

  const { createCompleted } = useGuideStore();

  return (
    <Flex flexDirection={'column'} w={'100%'}>
      {isClientSide && !createCompleted && (
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
          {t('driver.create_launchpad_header')}
        </Center>
      )}
      <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
        <Flex
          alignItems={'center'}
          cursor={'pointer'}
          gap={'6px'}
          onClick={() => {
            router.replace(lastRoute);
          }}
        >
          <MyIcon name="arrowLeft" w={'24px'} />
          <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
            {t(title)}
          </Box>
        </Flex>
        <Box flex={1}></Box>
        <Button
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          variant={'outline'}
          onClick={handleExportYaml}
        >
          {t('Export')} Yaml
        </Button>
        <Box position={'relative'}>
          <Button
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
              left={'-180px'}
              bottom={'-170px'}
              width={'250px'}
              bg={'#2563EB'}
              p={'16px'}
              borderRadius={'12px'}
              color={'#fff'}
            >
              <Flex alignItems={'center'} justifyContent={'space-between'}>
                <Text fontSize={'14px'} fontWeight={600}>
                  {t('driver.configure_launchpad')}
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
                {t('driver.define_image_settings')}
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
    </Flex>
  );
};

export default Header;
