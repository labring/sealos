import { applyLicense, checkLicenses, getLicenseByName, getLicenseRecord } from '@/api/license';
import { getClusterId, getPlatformEnv } from '@/api/platform';
import FileSelect, { FileItemType } from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { useToast } from '@/hooks/useToast';
import { decodeJWT } from '@/utils/crypto';
import download from '@/utils/downloadFIle';
import { serviceSideProps } from '@/utils/i18n';
import { json2License } from '@/utils/json2Yaml';
import { formatTime, useCopyData } from '@/utils/tools';
import { Box, Center, Divider, Flex, Image, Text } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';

export default function LicenseApp() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItemType[]>([]);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [purchaseLink, setPurchaseLink] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const queryClient = useQueryClient();

  const licenseMutation = useMutation(['licenseMutation'], {
    mutationFn: () => {
      const licenseFile = files[0].text;
      const licenseStr = json2License(licenseFile).yamlStr;
      return applyLicense([licenseStr], 'create');
    },
    async onSuccess() {
      const licenseFile = files[0].text;
      const licenseObj = json2License(licenseFile).yamlObj;
      const result = await getLicenseByName({ name: licenseObj.metadata.name });

      if (result.status.phase !== 'Active') {
        toast({
          title: result.status.reason,
          status: 'error'
        });
      } else {
        await checkLicenses();
        toast({
          title: t('Activation Successful'),
          status: 'success'
        });
      }
      queryClient.invalidateQueries(['getLicenseActive']);
    },
    onError(error: { message?: string }) {
      if (error?.message && typeof error?.message === 'string') {
        toast({
          title: error.message,
          status: 'error'
        });
      }
    }
  });

  const { data: systemInfo } = useQuery(['getClusterId'], () => getClusterId(), {
    onSuccess(data) {
      getPlatformEnv()
        .then((res) => {
          const main = res.LICENSE_DOMAIN;
          const link = `https://${main}/cluster?systemId=${data?.systemId}&nodeCount=${data?.nodeCount}&totalCpu=${data?.totalCpu}&totalMemory=${data?.totalMemory}`;
          setPurchaseLink(link);
        })
        .catch((err) => {
          toast({
            position: 'top',
            status: 'error',
            description: 'Get system env error'
          });
        });
    },
    onError(err) {
      toast({
        position: 'top',
        status: 'error',
        description: t('Failed to obtain cluster ID, contact administrator')
      });
    }
  });

  const { data } = useQuery(['getLicenseActive', page, pageSize], () =>
    getLicenseRecord({ page: page, pageSize: pageSize })
  );

  const activeLicense = debounce(async () => {
    if (files.length < 1) {
      return toast({
        title: t('token does not exist'),
        status: 'error'
      });
    }
    licenseMutation.mutate();
  }, 500);

  const downloadToken = (token: string) => {
    const result = Buffer.from(token, 'binary').toString('base64');
    download('token.txt', result);
  };

  const maxExpTime = useMemo(() => {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    if (data && data.length > 0) {
      const maxItem = data.reduce((item, license) => {
        const maxTime = decodeJWT(item.spec.token)?.exp || currentTimeInSeconds;
        const currentTime = decodeJWT(license.spec.token)?.exp || currentTimeInSeconds;
        return currentTime > maxTime ? license : item;
      });
      return decodeJWT(maxItem.spec.token)?.exp || currentTimeInSeconds;
    } else {
      return currentTimeInSeconds;
    }
  }, [data]);

  return (
    <Flex
      w="100%"
      minH={'100%'}
      minW={'1190px'}
      overflow={'scroll'}
      justifyContent={'center'}
      alignItems={'center'}
    >
      <Flex w="50%" pl="48px" justifyContent="center" alignItems="center" position={'relative'}>
        <Box position="relative">
          <Image
            draggable="false"
            w="616px"
            h="636px"
            src="/icons/license-bg.png"
            alt="license"
            objectFit="cover"
            borderRadius={'16px'}
          />
          <Flex
            bg={'rgba(255, 255, 255, 0.05)'}
            borderRadius={'12px'}
            justifyContent={'center'}
            flexDirection={'column'}
            position={'absolute'}
            color={'#FFF'}
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            p={{ base: '20px', xl: '36px' }}
          >
            <Text fontSize={'20px'} fontWeight={500} mb={'8px'}>
              {t('cluster_info')}
            </Text>

            <Text fontSize={'12px'}>
              {t('expire_date')}: {isClient && formatTime(maxExpTime * 1000)}
            </Text>

            <Divider my={'28px'} borderColor={'rgba(255, 255, 255, 0.05)'} />

            <Flex fontSize={'14px'} fontWeight={'400'} flexWrap={'wrap'} gap={'18px'}>
              <Text minW={'90px'}>ID: {systemInfo?.systemId}</Text>
              <Text>Nodes: {systemInfo?.nodeCount}</Text>
              <Text minW={'90px'}>CPU: {systemInfo?.totalCpu} Core</Text>
              <Text>Memory: {systemInfo?.totalMemory} GB</Text>
            </Flex>

            <Divider my={'28px'} borderColor={'rgba(255, 255, 255, 0.05)'} />

            <Center
              w="100%"
              h="42px"
              cursor={'pointer'}
              borderRadius={'8px'}
              bg={'#fff'}
              color={'#000'}
              fontWeight={500}
              fontSize={'14px'}
              onClick={() => window.open(purchaseLink)}
            >
              {t('Purchase Tip')}
            </Center>
          </Flex>
          <Flex position={'absolute'} bottom={'20px'} right={'48px'}>
            <Image alt="license" src="/icons/license-sealos.svg" />
          </Flex>
        </Box>
      </Flex>
      {/* right */}
      <Box w="50%" pl="108px" pr="70px">
        <Text color={'#262A32'} fontSize={'24px'} fontWeight={600}>
          {t('Activate License')}
        </Text>
        <FileSelect multiple={false} fileExtension={'.yaml'} files={files} setFiles={setFiles} />
        <Flex
          userSelect={'none'}
          ml={'auto'}
          mt="24px"
          borderRadius={'6px'}
          bg={'#24282C'}
          width={'218px'}
          h="44px"
          justifyContent={'center'}
          alignItems={'center'}
          cursor={licenseMutation.isLoading ? 'not-allowed' : 'pointer'}
          onClick={activeLicense}
        >
          <Text color={'#fff'} fontSize={'14px'} fontWeight={500}>
            {licenseMutation.isLoading ? 'loading' : t('Activate License')}
          </Text>
        </Flex>
        <Box bg={'#DEE0E2'} h={'1px'} w="100%" mt="26px"></Box>
        <Text mt="26px" color={'#262A32'} fontSize={'20px'} fontWeight={600}>
          {t('Activation Record')}
        </Text>

        {data && data?.length > 0 ? (
          <Box mt="12px" minW={'350px'} height={'300px'} overflowY={'auto'}>
            {data?.map((item, i) => {
              const iat = decodeJWT(item.spec.token)?.iat;
              const exp = decodeJWT(item.spec.token)?.exp;

              return (
                <Flex
                  w="100%"
                  key={item.metadata.uid}
                  p="12px 0 12px 16px"
                  border={'1px solid #EFF0F1'}
                  borderRadius={'4px'}
                  background={'#F8FAFB'}
                  justifyContent={'center'}
                  flexDirection={'column'}
                  mb="12px"
                >
                  <Flex>
                    <Image src={'/icons/license.svg'} w={'24px'} h={'24px'} alt="token" />
                    <Text color={'#111824'} fontSize={'16px'} fontWeight={500} ml="10px" mr="16px">
                      License
                    </Text>
                    <Flex
                      alignItems={'center'}
                      mr={{
                        sm: '8px',
                        md: '24px'
                      }}
                      ml={'auto'}
                      cursor={'pointer'}
                    >
                      <Text
                        color={'#485264'}
                        fontSize={'14px'}
                        fontWeight={500}
                        px="8px"
                        onClick={() => downloadToken(item.spec?.token)}
                      >
                        激活时间: {formatTime(iat ? iat * 1000 : '')}
                      </Text>
                    </Flex>
                  </Flex>
                  <Flex
                    mt={'12px'}
                    fontSize={'14px'}
                    fontWeight={500}
                    gap={'20px'}
                    alignItems={'center'}
                  >
                    <Text>CPU: {decodeJWT(item.spec.token)?.data.totalCPU}核</Text>
                    <Text>内存: {decodeJWT(item.spec.token)?.data.totalMemory}G</Text>
                    <Text>节点: {decodeJWT(item.spec.token)?.data.nodeCount}</Text>
                    <Text>到期时间: {formatTime(exp ? exp * 1000 : '')}</Text>
                  </Flex>
                </Flex>
              );
            })}
          </Box>
        ) : (
          <Flex
            mt="12px"
            minW={'350px'}
            height={'300px'}
            justifyContent={'center'}
            alignItems={'center'}
            flexDirection={'column'}
            color={'#485264'}
          >
            <MyIcon name="noEvents" w={'48px'} h={'48px'} color={'transparent'} />
            <Text mt="12px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
              {t('No Record')}
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}
