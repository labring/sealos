import { applyLicense, getLicenseRecord } from '@/api/license';
import CurrencySymbol from '@/components/CurrencySymbol';
import FileSelect, { FileItemType } from '@/components/FileSelect';
import Pagination from '@/components/Pagination';
import { useToast } from '@/hooks/useToast';
import { json2License } from '@/utils/json2Yaml';
import { Box, Flex, Icon, Image, Link, Text, Button } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';

export default function LicenseApp() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItemType[]>([]);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const licenseMutation = useMutation({
    mutationFn: (yamlList: string[]) => applyLicense(yamlList, 'create'),
    onSuccess(data) {
      console.log(data);
    },
    onError(error) {
      console.log(error);
    }
  });

  const { data } = useQuery(['getLicenseActive', page, pageSize], () =>
    getLicenseRecord({ page: page, pageSize: pageSize })
  );

  const activeLicense = debounce(async () => {
    if (files.length < 1) {
      return toast({
        title: 'token 不存在',
        status: 'error'
      });
    }
    const yamlList = files.map((item) => json2License(item.text));
    licenseMutation.mutate(yamlList);
  }, 500);

  return (
    <Flex w="100%" h="100%">
      <Flex
        w="50%"
        m="24px 108px 34px 48px"
        overflow={'hidden'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
      >
        <Box flexShrink={0} textAlign="center">
          <Image
            alt="license"
            src="/icons/license-bg.svg"
            objectFit="contain"
            maxH="100%" // 设置图片的最大高度为100%以适应空间
          />
        </Box>
        <Box position={'absolute'} color={'#FFF'}>
          <Text fontSize={'32px'} fontWeight={600}>
            {t('Purchase License')}
          </Text>
          <Box mt="45px">
            {t('Please go to')}
            <Link px="4px" color={'#36ADEF'} href="https://cloud.sealos.io/license" isExternal>
              https://cloud.sealos.io/license
            </Link>
            {t('Buy')}
          </Box>
        </Box>
      </Flex>
      {/* rihgt */}
      <Box w="50%" pr="70px">
        <Text color={'#262A32'} fontSize={'24px'} fontWeight={600} mt="34px">
          {t('Activate License')}
        </Text>
        <FileSelect fileExtension={'.txt'} files={files} setFiles={setFiles} />
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
        <Box mt="12px" height={'300px'} overflowY={'scroll'}>
          {data?.items?.map((license, i) => (
            <Flex
              key={license._id}
              minW={'350px'}
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
                {license.payload?.amt}
              </Text>
              <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500} ml="auto">
                {t('Activation time')} {license.meta.createTime}
              </Text>

              <Flex
                alignItems={'center'}
                mx={{
                  sm: '8px',
                  md: '24px'
                }}
                cursor={'pointer'}
              >
                <Text color={'#1D8CDC'} fontSize={'14px'} fontWeight={600} px="8px">
                  Token
                </Text>
                <Icon fill="#1D8CDC" viewBox="0 0 16 16">
                  <path d="M4.76693 14.0667C4.60026 13.9 4.51693 13.7027 4.51693 13.4747C4.51693 13.2471 4.60026 13.05 4.76693 12.8833L9.65026 8L4.75026 3.1C4.59471 2.94444 4.51693 2.75 4.51693 2.51666C4.51693 2.28333 4.60026 2.08333 4.76693 1.91666C4.93359 1.75 5.13093 1.66666 5.35893 1.66666C5.58648 1.66666 5.78359 1.75 5.95026 1.91666L11.5503 7.53333C11.6169 7.6 11.6643 7.67222 11.6923 7.75C11.7198 7.82778 11.7336 7.91111 11.7336 8C11.7336 8.08889 11.7198 8.17222 11.6923 8.25C11.6643 8.32778 11.6169 8.4 11.5503 8.46666L5.93359 14.0833C5.77804 14.2389 5.58648 14.3167 5.35893 14.3167C5.13093 14.3167 4.93359 14.2333 4.76693 14.0667Z" />
                </Icon>
              </Flex>
            </Flex>
          ))}
        </Box>
        <Pagination
          totalItems={data?.totalCount || 0}
          itemsPerPage={pageSize}
          onPageChange={(page: number) => setPage(page)}
        />
      </Box>
    </Flex>
  );
}
