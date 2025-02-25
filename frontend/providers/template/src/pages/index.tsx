import { getTemplates } from '@/api/platform';
import Banner from '@/components/Banner';
import MyIcon from '@/components/Icon';
import { useCachedStore } from '@/store/cached';
import { useSystemConfigStore } from '@/store/config';
import { useSearchStore } from '@/store/search';
import { SystemConfigType, TemplateType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import { compareFirstLanguages, formatStarNumber } from '@/utils/tools';
import {
  Avatar,
  AvatarGroup,
  Box,
  Center,
  Flex,
  Grid,
  Icon,
  Image,
  Spinner,
  Tag,
  Text,
  Tooltip
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { MouseEvent, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { ShareIcon } from '@/components/icons';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

export default function AppList({
  showCarousel,
  brandName
}: {
  showCarousel: boolean;
  brandName: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { searchValue, appType } = useSearchStore();
  const { setInsideCloud } = useCachedStore();
  const { envs } = useSystemConfigStore();

  const { data } = useQuery(['listTemplate', i18n.language], () => getTemplates(i18n.language), {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 3
  });

  const filterData = useMemo(() => {
    const typeFilteredResults = data?.templates?.filter((item: TemplateType) => {
      if (appType === 'all') return true;
      const isMatchType = item?.spec?.categories?.includes(appType);
      return isMatchType;
    });

    const searchResults = typeFilteredResults?.filter((item: TemplateType) => {
      const nameMatches = item?.metadata?.name?.toLowerCase().includes(searchValue.toLowerCase());
      const titleMatches = item?.spec?.title?.toLowerCase().includes(searchValue.toLowerCase());
      return nameMatches || titleMatches;
    });

    return searchResults;
  }, [data?.templates, appType, searchValue]);

  const goDeploy = (name: string) => {
    if (!name) return;
    router.push({
      pathname: '/deploy',
      query: {
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
      position={'relative'}
      borderRadius={'12px'}
      background={'linear-gradient(180deg, #FFF 0%, rgba(255, 255, 255, 0.70) 100%)'}
      py="24px"
      px="42px"
    >
      <Head>
        <title>
          {i18n.language === 'en'
            ? `Enterprise-level distributed application hosting platform - ${brandName}`
            : `企业级分布式应用托管平台 - ${brandName}`}
        </title>
        <meta
          name="keywords"
          content={
            i18n.language === 'en'
              ? 'Distributed applications, Application hosting, Application deployment, Containers and middleware, PaaS'
              : '分布式应用,应用托管,应用部署,容器与中间件,PaaS平台'
          }
        />
        <meta
          name="description"
          content={
            i18n.language === 'en'
              ? `All-in-one platform for app development and deployment. Features app engine, API gateway. Deploy your app with one click.`
              : `提供高性能可伸缩的容器应用管理能力，支持企业级 Kubernetes 容器化应用的全生命周期管理,一站式集成应用创建、开发、部署、上线等功能，提供了应用引擎、前后端开发框架、API网关、调度引擎等模块，一键部署Helm应用。`
          }
        />
      </Head>
      {!!data?.templates?.length ? (
        <>
          {showCarousel && <Banner />}
          {filterData?.length && filterData?.length > 0 ? (
            <Grid
              justifyContent={'center'}
              w={'100%'}
              gridTemplateColumns="repeat(auto-fill,minmax(320px,1fr))"
              gridGap={'24px'}
              minW={'480px'}
            >
              {filterData?.map((item: TemplateType) => {
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
                    h={'184px'}
                    p={'24px'}
                    borderRadius={'8px'}
                    backgroundColor={'#fff'}
                    boxShadow={'0px 2px 4px 0px rgba(187, 196, 206, 0.25)'}
                    border={'1px solid #EAEBF0'}
                  >
                    <Flex alignItems={'center'}>
                      <Box
                        p={'6px'}
                        w={'48px'}
                        h={'48px'}
                        boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
                        borderRadius={'4px'}
                        backgroundColor={'#fff'}
                        border={' 1px solid rgba(255, 255, 255, 0.50)'}
                      >
                        <Image
                          src={item.spec.i18n?.[i18n.language]?.icon ?? item?.spec?.icon}
                          alt="logo"
                          width={'36px'}
                          height={'36px'}
                          loading="lazy"
                        />
                      </Box>
                      <Flex ml="16px" noOfLines={2} flexDirection={'column'}>
                        <Text fontSize={'18px'} fontWeight={600} color={'#111824'}>
                          {item.spec.i18n?.[i18n.language]?.title ?? item.spec.title}
                        </Text>
                        {envs?.SHOW_AUTHOR === 'true' && (
                          <Text fontSize={'12px'} fontWeight={400} color={'#5A646E'}>
                            By {item.spec.author}
                          </Text>
                        )}
                      </Flex>
                      {item.spec?.deployCount && item.spec?.deployCount > 6 && (
                        <Tooltip
                          label={t('users installed the app', { count: item.spec.deployCount })}
                          hasArrow
                          bg="#FFF"
                          placement="bottom-end"
                        >
                          <Flex gap={'6px'} ml={'auto'}>
                            <AvatarGroup size={'xs'} max={3}>
                              <Avatar name={nanoid(6)} />
                              <Avatar name={nanoid(6)} />
                              <Avatar name={nanoid(6)} />
                            </AvatarGroup>
                            <Text>+{formatStarNumber(item.spec.deployCount)}</Text>
                          </Flex>
                        </Tooltip>
                      )}
                    </Flex>
                    <Text
                      css={`
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      `}
                      my={'16px'}
                      fontSize={'12px'}
                      color={'5A646E'}
                      fontWeight={400}
                    >
                      {item.spec.i18n?.[i18n.language]?.description ?? item.spec.description}
                    </Text>
                    <Flex
                      mt="auto"
                      justifyContent={'space-between'}
                      alignItems={'center'}
                      gap={'20px'}
                    >
                      <Flex alignItems={'center'} gap={'10px'} overflow={'hidden'}>
                        {item?.spec?.categories?.map((i) => (
                          <Tag
                            flexShrink={0}
                            key={i}
                            bg="#F4F4F7"
                            border={'1px solid #E8EBF0'}
                            fontSize={'10px'}
                            color={'5A646E'}
                            fontWeight={400}
                          >
                            {t(`SideBar.${i}`)}
                          </Tag>
                        ))}
                      </Flex>
                      <Center
                        cursor={'pointer'}
                        onClick={(e) =>
                          goGithub(
                            e,
                            item.spec?.i18n?.[i18n.language]?.gitRepo ?? item?.spec?.gitRepo
                          )
                        }
                      >
                        <ShareIcon color={'#667085'} />
                      </Center>
                    </Flex>
                  </Flex>
                );
              })}
            </Grid>
          ) : (
            <Center w="full" h="calc(100% - 285px)">
              <Center border={'1px dashed #9CA2A8'} borderRadius="50%" w={'48px'} h={'48px'}>
                <MyIcon color={'#7B838B'} name="empty"></MyIcon>
              </Center>
            </Center>
          )}
        </>
      ) : (
        <Flex alignItems={'center'} justifyContent={'center'} w="full" h="full">
          <Spinner size="xl" color="#219BF4" />
        </Flex>
      )}
    </Box>
  );
}

// https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props#context-parameter
export async function getServerSideProps(content: any) {
  const forcedLanguage = process.env.FORCED_LANGUAGE;
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos';
  const local =
    forcedLanguage ||
    content?.req?.cookies?.NEXT_LOCALE ||
    compareFirstLanguages(content?.req?.headers?.['accept-language'] || 'zh');

  content?.res.setHeader(
    'Set-Cookie',
    `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`
  );

  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;
  const { data } = (await (await fetch(`${baseurl}/api/platform/getSystemConfig`)).json()) as {
    data: SystemConfigType;
  };

  return {
    props: {
      ...(await serviceSideProps(content)),
      showCarousel: data.showCarousel,
      brandName
    }
  };
}
