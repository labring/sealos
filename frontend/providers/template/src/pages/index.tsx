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

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

export default function AppList({ showCarousel }: { showCarousel: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { searchValue, appType } = useSearchStore();
  const { setInsideCloud } = useCachedStore();
  const { envs } = useSystemConfigStore();

  const { data } = useQuery(['listTemplate'], getTemplates, {
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
      return item?.metadata?.name?.toLowerCase().includes(searchValue.toLowerCase());
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
                          src={item?.spec?.icon}
                          alt="logo"
                          width={'36px'}
                          height={'36px'}
                          loading="lazy"
                        />
                      </Box>
                      <Flex ml="16px" noOfLines={2} flexDirection={'column'}>
                        <Text fontSize={'18px'} fontWeight={600} color={'#111824'}>
                          {item?.spec?.title}
                        </Text>
                        {envs?.SHOW_AUTHOR === 'true' && (
                          <Text fontSize={'12px'} fontWeight={400} color={'#5A646E'}>
                            By {item?.spec?.author}
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
                      {item?.spec?.description}
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
                      <Center cursor={'pointer'} onClick={(e) => goGithub(e, item?.spec?.gitRepo)}>
                        <Icon
                          width="16px"
                          height="17px"
                          viewBox="0 0 16 17"
                          fill="#5A646E"
                          _hover={{
                            fill: '#0884DD'
                          }}
                        >
                          <path d="M13.6667 9.00004C13.4 9.00004 13.1667 9.23337 13.1667 9.50004V13.5C13.1667 13.6 13.1 13.6667 13 13.6667H3C2.9 13.6667 2.83333 13.6 2.83333 13.5V3.50004C2.83333 3.40004 2.9 3.33337 3 3.33337H7C7.26667 3.33337 7.5 3.10004 7.5 2.83337C7.5 2.56671 7.26667 2.33337 7 2.33337H3C2.36667 2.33337 1.83333 2.86671 1.83333 3.50004V13.5C1.83333 14.1334 2.36667 14.6667 3 14.6667H13C13.6333 14.6667 14.1667 14.1334 14.1667 13.5V9.50004C14.1667 9.23337 13.9333 9.00004 13.6667 9.00004Z" />
                          <path d="M13.6667 2.33337H10C9.73333 2.33337 9.5 2.56671 9.5 2.83337C9.5 3.10004 9.73333 3.33337 10 3.33337H12.4667L7.96667 7.80004C7.76667 8.00004 7.76667 8.30004 7.96667 8.50004C8.06667 8.60004 8.2 8.63337 8.33333 8.63337C8.46667 8.63337 8.6 8.60004 8.7 8.50004L13.1667 4.03337V6.50004C13.1667 6.76671 13.4 7.00004 13.6667 7.00004C13.9333 7.00004 14.1667 6.76671 14.1667 6.50004V2.83337C14.1667 2.56671 13.9333 2.33337 13.6667 2.33337Z" />
                        </Icon>
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
  const local =
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
      showCarousel: data.showCarousel
    }
  };
}
