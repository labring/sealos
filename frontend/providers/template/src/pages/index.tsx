import { updateRepo } from '@/api/platform';
import MyIcon from '@/components/Icon';
import { GET } from '@/services/request';
import { useCachedStore } from '@/store/cached';
import { TemplateType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import {
  Box,
  Flex,
  Grid,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Text
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';

function Index() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { setInsideCloud, insideCloud } = useCachedStore();

  const { data: PlatformEnvs } = useQuery(['getPlatForm'], () => GET('/api/platform/getEnv'));

  const { data: FastDeployTemplates } = useQuery(['listTemplte'], () => GET('/api/listTemplate'), {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000
  });

  useQuery(['updateRepo'], () => updateRepo(), {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000
  });

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    searchTemplate(e.target.value);
  };

  const searchTemplate = (value: string) => {
    const filterData = FastDeployTemplates?.filter((item: TemplateType) => {
      return item?.metadata?.name?.toLowerCase().includes(value.toLowerCase());
    });
    setSearchResults(filterData);
  };

  const filterData = useMemo(() => {
    return searchValue ? searchResults : FastDeployTemplates;
  }, [FastDeployTemplates, searchResults, searchValue]);

  const goDeploy = (name: string) => {
    if (!name) return;
    router.push({
      pathname: '/deploy',
      query: {
        type: 'form',
        templateName: name
      }
    });
  };

  const goGithub = (e: MouseEvent<HTMLDivElement>, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  useEffect(() => {
    setInsideCloud(!(window.top === window));
    if (router?.query?.templateName) {
      const name = router?.query?.templateName;
      router.push({
        pathname: '/deploy',
        query: {
          templateName: name
        }
      });
    }
  }, [router, setInsideCloud]);

  return (
    <Box
      flexDirection={'column'}
      height={'100%'}
      overflow={'auto'}
      backgroundColor={'#edeff0'}
      position={'relative'}
    >
      <Flex justifyContent={'center'} flexDirection={'column'} alignItems={'center'} pt={'24px'}>
        <Text color={'24282C'} fontSize={'48px'} fontWeight={500}>
          {t('Templates')}
        </Text>
        <Text color={'5A646E'} fontSize={'12px'} fontWeight={500}>
          {t('One Click Deployment')}
        </Text>

        <Flex
          justifyContent={'center'}
          alignItems={'center'}
          p="4px 12px"
          position={'absolute'}
          right={'30px'}
          top={'26px'}
          backgroundColor={'#FFF'}
          borderRadius={'40px'}
          onClick={() => router.push('/develop')}
        >
          <MyIcon name="tool" fill={'transparent'} />
          <Text ml="8px" color={'#485058'} fontWeight={500} cursor={'pointer'} fontSize={'12px'}>
            {t('develop.YAML Detection Tool')}
          </Text>
        </Flex>

        <InputGroup mt={'24px'} maxWidth={'674px'}>
          <InputLeftElement pointerEvents="none" pt={'6px'}>
            <svg
              color="#24282C"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21.71 20.29L18 16.61C19.4401 14.8144 20.1375 12.5353 19.9488 10.2413C19.7601 7.9473 18.6997 5.81278 16.9855 4.27664C15.2714 2.7405 13.0338 1.91951 10.7329 1.98247C8.43204 2.04543 6.24273 2.98756 4.61515 4.61514C2.98757 6.24272 2.04543 8.43203 1.98247 10.7329C1.91951 13.0338 2.74051 15.2714 4.27665 16.9855C5.81279 18.6997 7.94731 19.7601 10.2413 19.9488C12.5353 20.1375 14.8144 19.4401 16.61 18L20.29 21.68C20.383 21.7737 20.4936 21.8481 20.6154 21.8989C20.7373 21.9497 20.868 21.9758 21 21.9758C21.132 21.9758 21.2627 21.9497 21.3846 21.8989C21.5064 21.8481 21.617 21.7737 21.71 21.68C21.8902 21.4935 21.991 21.2443 21.991 20.985C21.991 20.7257 21.8902 20.4765 21.71 20.29ZM11 18C9.61553 18 8.26216 17.5895 7.11101 16.8203C5.95987 16.0511 5.06266 14.9579 4.53285 13.6788C4.00303 12.3997 3.86441 10.9922 4.13451 9.63436C4.4046 8.2765 5.07129 7.02922 6.05026 6.05025C7.02922 5.07128 8.2765 4.4046 9.63437 4.1345C10.9922 3.8644 12.3997 4.00303 13.6788 4.53284C14.9579 5.06265 16.0511 5.95986 16.8203 7.111C17.5895 8.26215 18 9.61553 18 11C18 12.8565 17.2625 14.637 15.9498 15.9497C14.637 17.2625 12.8565 18 11 18Z"
                fill="#24282C"
              />
            </svg>
          </InputLeftElement>
          <Input
            h={'42px'}
            backgroundColor={'#FFF'}
            type="tel"
            placeholder={t('Template Name') || 'Template Name'}
            onChange={handleSearch}
          />
        </InputGroup>
      </Flex>
      {/* <LangSelect /> */}
      <Flex p={'32px'} minW={'750px'} maxW={'1448px'} m={'0 auto'} justifyContent={'center'}>
        <Grid
          justifyContent={'center'}
          w={'100%'}
          gridTemplateColumns="repeat(auto-fit, minmax(328px, 328px))"
          gridGap={'24px'}
        >
          {filterData &&
            filterData?.map((item: TemplateType) => {
              return (
                <Flex
                  position={'relative'}
                  cursor={'pointer'}
                  onClick={() => goDeploy(item?.metadata?.name)}
                  _hover={{
                    borderColor: '#36ADEF',
                    boxShadow: '0px 4px 5px 0px rgba(185, 196, 205, 0.25)'
                  }}
                  key={item?.metadata?.name}
                  flexDirection={'column'}
                  w={'328px'}
                  minH={'214px'}
                  h="250px"
                  p={'24px'}
                  borderRadius={'6px'}
                  backgroundColor={'#fff'}
                  border={'1px solid #DEE0E2'}
                >
                  <Box
                    p={'6px'}
                    w={'48px'}
                    h={'48px'}
                    borderRadius={'4px'}
                    backgroundColor={'#fff'}
                    border={' 1px solid #DEE0E2'}
                  >
                    <Image src={item?.spec?.icon} alt="" width={'36px'} height={'36px'} />
                  </Box>
                  <Flex mt={'12px'} alignItems={'center'} justifyContent="space-between">
                    <Text w={'170px'} fontSize={'24px'} fontWeight={600} color={'#24282C'}>
                      {item?.spec?.title}
                    </Text>
                    <Flex
                      cursor={'pointer'}
                      onClick={() => goDeploy(item?.metadata?.name)}
                      justifyContent={'center'}
                      alignItems={'center'}
                      w={'60px'}
                      h={'28px'}
                      borderRadius={'4px'}
                      border={'1px solid #DEE0E2'}
                      backgroundColor={'#F4F6F8'}
                    >
                      Deploy
                    </Flex>
                  </Flex>

                  <Text
                    css={`
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    `}
                    mt={'8px'}
                    fontSize={'12px'}
                    color={'5A646E'}
                    fontWeight={400}
                  >
                    {item?.spec?.description}
                  </Text>
                  <Flex mt={'auto'} justifyContent={'space-between'} alignItems={'center'}>
                    <Flex alignItems={'center'} fontSize={'12px'} color={'5A646E'} fontWeight={400}>
                      <Text>By</Text>
                      <Text ml={'4px'}>{item?.spec?.author}</Text>
                    </Flex>
                    <Box cursor={'pointer'} onClick={(e) => goGithub(e, item?.spec?.github)}>
                      <MyIcon name="jump"></MyIcon>
                    </Box>
                  </Flex>
                </Flex>
              );
            })}
        </Grid>
      </Flex>
    </Box>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

export default Index;
