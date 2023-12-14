import { applyLicense, getLicenseRecord } from '@/api/license';
import { getClusterId, getPlatformEnv } from '@/api/platform';
import CurrencySymbol from '@/components/CurrencySymbol';
import FileSelect, { FileItemType } from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { useToast } from '@/hooks/useToast';
import download from '@/utils/downloadFIle';
import { serviceSideProps } from '@/utils/i18n';
import { json2License } from '@/utils/json2Yaml';
import { addHoursToTime, useCopyData } from '@/utils/tools';
import { Box, Center, Flex, Image, Link, Text } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export default function LicenseApp() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItemType[]>([]);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const { copyData } = useCopyData();
  const [purchaseLink, setPurchaseLink] = useState('');
  const queryClient = useQueryClient();

  const licenseMutation = useMutation({
    mutationFn: (yamlList: string[]) => applyLicense(yamlList, 'create'),
    onSuccess(data) {
      console.log(data, 'data');
      toast({
        title: t('Activation Successful'),
        status: 'success'
      });
      queryClient.invalidateQueries(['getLicenseActive']);
    },
    onError(error: { message?: string }) {
      console.log(error);
      if (error?.message && typeof error?.message === 'string') {
        toast({
          title: error.message,
          status: 'error'
        });
      }
    }
  });

  const { data: kubeSystem } = useQuery(['getClusterId'], () => getClusterId(), {
    onSuccess(data) {
      getPlatformEnv()
        .then((res) => {
          const main = res.LICENSE_DOMAIN;
          const link = `https://${main}/cluster?systemId=${data?.systemId}`;
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
    const yamlList = files.map((item) => json2License(item.text));
    licenseMutation.mutate(yamlList);
  }, 500);

  const downloadToken = (token: string) => {
    const result = Buffer.from(token, 'binary').toString('base64');
    download('token.txt', result);
  };

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
            alignItems={'center'}
            justifyContent={'center'}
            flexDirection={'column'}
            position={'absolute'}
            color={'#FFF'}
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
          >
            <Text fontSize={'24px'} fontWeight={600}>
              {t('Cluster ID', { id: kubeSystem?.systemId })}
            </Text>
            <Box w="194px" h="54px" mt="50px" position={'relative'}>
              <Center
                position={'absolute'}
                top={0}
                left={0}
                bg="rgba(255, 255, 255, 0.20)"
                filter={'blur(4px)'}
                w="194px"
                h="54px"
                borderRadius={'4px'}
              ></Center>
              <Center
                cursor={'pointer'}
                borderRadius={'4px'}
                position={'absolute'}
                bg={'#fff'}
                color={'#000'}
                w="184px"
                h="42px"
                top={'6px'}
                left={'6px'}
                fontWeight={600}
                fontSize={'16px'}
                onClick={() => window.open(purchaseLink)}
              >
                {t('Purchase Tip')}
              </Center>
            </Box>
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
        <FileSelect fileExtension={'.yaml'} files={files} setFiles={setFiles} />
        <Flex
          userSelect={'none'}
          ml={'auto'}
          mt="24px"
          borderRadius={'4px'}
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

        {data?.items && data?.items?.length > 0 ? (
          <Box mt="12px" minW={'350px'} height={'300px'} overflowY={'auto'}>
            {data?.items?.map((license, i) => (
              <Flex
                w="100%"
                key={license._id}
                p="12px 0 12px 16px"
                border={'1px solid #EFF0F1'}
                borderRadius={'4px'}
                background={'#F8FAFB'}
                alignItems={'center'}
                mb="12px"
              >
                <Image src={'/icons/license.svg'} w={'24px'} h={'24px'} alt="token" />
                <Text color={'#485058'} fontSize={'16px'} fontWeight={500} ml="10px" mr="16px">
                  License
                </Text>
                <CurrencySymbol />
                <Text ml="6px" color={'#5A646E'} fontSize={'14px'} fontWeight={500}>
                  {license?.claims?.data?.amount}
                </Text>
                <Text
                  color={'#5A646E'}
                  fontSize={'12px'}
                  fontWeight={500}
                  ml="auto"
                  mr={{
                    sm: '20px',
                    md: '34px'
                  }}
                >
                  {t('Activation time')} {addHoursToTime(license?.activationTime || '')}
                </Text>
                {/* <Flex
                  alignItems={'center'}
                  mx={{
                    sm: '8px',
                    md: '24px'
                  }}
                  cursor={'pointer'}
                >
                  <Text
                    color={'#1D8CDC'}
                    fontSize={'14px'}
                    fontWeight={600}
                    px="8px"
                    onClick={() => downloadToken(license?.token)}
                  >
                    License
                  </Text>
                  <Icon fill="#1D8CDC" viewBox="0 0 16 16">
                    <path d="M4.76693 14.0667C4.60026 13.9 4.51693 13.7027 4.51693 13.4747C4.51693 13.2471 4.60026 13.05 4.76693 12.8833L9.65026 8L4.75026 3.1C4.59471 2.94444 4.51693 2.75 4.51693 2.51666C4.51693 2.28333 4.60026 2.08333 4.76693 1.91666C4.93359 1.75 5.13093 1.66666 5.35893 1.66666C5.58648 1.66666 5.78359 1.75 5.95026 1.91666L11.5503 7.53333C11.6169 7.6 11.6643 7.67222 11.6923 7.75C11.7198 7.82778 11.7336 7.91111 11.7336 8C11.7336 8.08889 11.7198 8.17222 11.6923 8.25C11.6643 8.32778 11.6169 8.4 11.5503 8.46666L5.93359 14.0833C5.77804 14.2389 5.58648 14.3167 5.35893 14.3167C5.13093 14.3167 4.93359 14.2333 4.76693 14.0667Z" />
                  </Icon>
                </Flex> */}
              </Flex>
            ))}
          </Box>
        ) : (
          <Flex
            mt="12px"
            minW={'350px'}
            height={'300px'}
            justifyContent={'center'}
            alignItems={'center'}
            flexDirection={'column'}
          >
            <MyIcon name="noEvents" w={'48px'} h={'48px'} color={'transparent'} />
            <Text mt="12px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
              {t('No Record')}
            </Text>
          </Flex>
        )}

        {data?.totalCount !== 0 && (
          <Pagination
            totalItems={data?.totalCount || 0}
            itemsPerPage={pageSize}
            onPageChange={(page: number) => setPage(page)}
          />
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
