import { getTemplateSource, postDeployApp } from '@/api/app';
import { getPlatformEnv } from '@/api/platform';
import { editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useCachedStore } from '@/store/cached';
import { useGlobalStore } from '@/store/global';
import { useSearchStore } from '@/store/search';
import type { QueryType, YamlItemType } from '@/types';
import { ApplicationType, TemplateSourceType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import { compareFirstLanguages, deepSearch, useCopyData } from '@/utils/tools';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import ReadMe from './components/ReadMe';
import { getTemplateInputDefaultValues, getTemplateValues } from '@/utils/template';
import { useUserStore } from '@/store/user';
import { getResourceUsage } from '@/utils/usage';
import Head from 'next/head';
import { useMessage } from '@sealos/ui';

const ErrorModal = dynamic(() => import('./components/ErrorModal'));
const Header = dynamic(() => import('./components/Header'), { ssr: false });

export default function EditApp({
  appName,
  metaData,
  brandName,
  readmeContent,
  readUrl
}: {
  appName?: string;
  metaData: {
    title: string;
    keywords: string;
    description: string;
  };
  brandName?: string;
  readmeContent: string;
  readUrl: string;
}) {
  const { t, i18n } = useTranslation();
  const { message: toast } = useMessage();
  const router = useRouter();
  const { copyData } = useCopyData();
  const { templateName } = router.query as QueryType;
  const { Loading, setIsLoading } = useLoading();
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(false);
  const [templateSource, setTemplateSource] = useState<TemplateSourceType>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const { screenWidth } = useGlobalStore();
  const { setCached, cached, insideCloud, deleteCached, setInsideCloud } = useCachedStore();
  const { setAppType } = useSearchStore();
  const { userSourcePrice, checkQuotaAllow, loadUserQuota } = useUserStore();
  useEffect(() => {
    loadUserQuota();
  }, []);

  const detailName = useMemo(
    () => templateSource?.source?.defaults?.app_name?.value || '',
    [templateSource]
  );

  const usage = useMemo(() => {
    const usage = getResourceUsage(yamlList?.map((item) => item.value) || []);
    return usage;
  }, [yamlList]);

  const { data: platformEnvs } = useQuery(['getPlatformEnvs'], getPlatformEnv, {
    staleTime: 5 * 60 * 1000
  });

  const { openConfirm, ConfirmChild } = useConfirm({
    content: insideCloud ? 'Confirm Deploy Application?' : 'Heading to sealos soon'
  });

  const { openConfirm: openConfirm2, ConfirmChild: ConfirmChild2 } = useConfirm({
    content: 'Do you want to jump to the app details page'
  });

  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2);
    if (val < 20) {
      return 20;
    }
    return val;
  }, [screenWidth]);

  const generateYamlData = useCallback(
    (templateSource: TemplateSourceType, inputs: Record<string, string>): YamlItemType[] => {
      if (!templateSource) return [];
      const app_name = templateSource?.source?.defaults?.app_name?.value;
      const { defaults, defaultInputs } = getTemplateValues(templateSource);
      const data = {
        ...platformEnvs,
        ...templateSource?.source,
        inputs: {
          ...defaultInputs,
          ...inputs
        },
        defaults: defaults
      };
      const generateStr = parseTemplateString(templateSource.appYaml, data);
      return generateYamlList(generateStr, app_name);
    },
    [platformEnvs]
  );

  const formOnchangeDebounce = useCallback(
    debounce((inputs: Record<string, string>) => {
      try {
        if (!templateSource) return;
        const list = generateYamlData(templateSource, inputs);
        setYamlList(list);
      } catch (error) {
        console.log(error);
      }
    }, 500),
    [templateSource, generateYamlData]
  );

  const getCachedValue = ():
    | {
        cachedKey: string;
        [key: string]: any;
      }
    | undefined => {
    if (!cached) return undefined;
    const cachedValue = JSON.parse(cached);
    return cachedValue?.cachedKey === templateName ? cachedValue : undefined;
  };

  // form
  const formHook = useForm({
    defaultValues: getTemplateInputDefaultValues(templateSource),
    values: getCachedValue()
  });

  // watch form change, compute new yaml
  useEffect(() => {
    const subscription = formHook.watch((data: Record<string, string>) => {
      data && formOnchangeDebounce(data);
    });
    return () => subscription.unsubscribe();
  }, [formHook, formOnchangeDebounce]);

  const submitSuccess = async () => {
    const quoteCheckRes = checkQuotaAllow({
      cpu: usage.cpu.max,
      memory: usage.memory.max,
      storage: usage.storage.max
    });

    if (quoteCheckRes) {
      return toast({
        status: 'warning',
        title: t(quoteCheckRes),
        duration: 5000,
        isClosable: true
      });
    }
    setIsLoading(true);

    try {
      if (!insideCloud) {
        handleOutside();
      } else {
        await handleInside();
      }
    } catch (error) {
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const handleOutside = () => {
    setCached(JSON.stringify({ ...formHook.getValues(), cachedKey: templateName }));

    const params = new URLSearchParams();
    ['k', 's', 'bd_vid'].forEach((param) => {
      const value = router.query[param];
      if (typeof value === 'string') {
        params.append(param, value);
      }
    });

    const queryString = params.toString();

    const baseUrl = `https://${platformEnvs?.DESKTOP_DOMAIN}/`;
    const encodedTemplateQuery = encodeURIComponent(
      `?templateName=${templateName}&sealos_inside=true`
    );
    const templateQuery = `openapp=system-template${encodedTemplateQuery}`;
    const href = `${baseUrl}${
      queryString ? `?${queryString}&${templateQuery}` : `?${templateQuery}`
    }`;

    window.open(href, '_self');
  };

  const handleInside = async () => {
    const yamls = yamlList.map((item) => item.value);
    await postDeployApp(yamls, 'create');

    toast({
      title: t(applySuccess),
      status: 'success'
    });

    deleteCached();
    setAppType(ApplicationType.MyApp);
    router.push({
      pathname: '/instance',
      query: { instanceName: detailName }
    });
  };

  const submitError = async () => {
    await formHook.trigger();
    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  };

  const parseTemplate = (res: TemplateSourceType) => {
    try {
      setTemplateSource(res);
      const inputs = getCachedValue() ? JSON.parse(cached) : getTemplateInputDefaultValues(res);
      const list = generateYamlData(res, inputs);
      setYamlList(list);
    } catch (err) {
      console.log(err, 'getTemplateData');
      toast({
        title: deepSearch(err),
        status: 'error',
        position: 'top',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const { data } = useQuery(
    ['getTemplateSource', templateName],
    () => getTemplateSource(templateName),
    {
      onSuccess(data) {
        parseTemplate(data);
      },
      onError(err) {
        toast({
          title: deepSearch(err),
          status: 'error',
          position: 'top',
          duration: 3000,
          isClosable: true
        });
      }
    }
  );

  const copyTemplateLink = () => {
    const str = `https://${platformEnvs?.DESKTOP_DOMAIN}/?openapp=system-template%3FtemplateName%3D${appName}`;
    copyData(str);
  };

  useEffect(() => {
    setInsideCloud(!(window.top === window));

    if (!templateName) {
      toast({
        title: t('TemplateNameError'),
        status: 'error',
        position: 'top',
        duration: 3000,
        isClosable: true
      });
    }
  }, [setInsideCloud, t, templateName, toast]);

  return (
    <Box
      flexDirection={'column'}
      height={'100%'}
      overflow={'auto'}
      position={'relative'}
      borderRadius={'12px'}
      background={'linear-gradient(180deg, #FFF 0%, rgba(255, 255, 255, 0.70) 100%)'}
    >
      <Head>
        <title>{`${metaData.title} ${
          i18n.language === 'en'
            ? `Deployment and installation tutorial - ${brandName}`
            : `部署和安装教程 - ${brandName}`
        }`}</title>
        <meta name="keywords" content={metaData.keywords} />
        <meta name="description" content={metaData.description} />
      </Head>
      <Flex
        zIndex={99}
        position={'sticky'}
        top={0}
        left={0}
        w={'100%'}
        h={'50px'}
        borderBottom={'1px solid #EAEBF0'}
        justifyContent={'start'}
        alignItems={'center'}
        backgroundColor={'rgba(255, 255, 255)'}
        backdropBlur={'100px'}
      >
        <Flex
          alignItems={'center'}
          fontWeight={500}
          fontSize={16}
          color={'#7B838B'}
          cursor={'pointer'}
        >
          <Flex
            alignItems={'center'}
            css={{
              ':hover': {
                fill: '#219BF4',
                color: '#219BF4',
                '> svg': {
                  fill: '#219BF4'
                }
              }
            }}
          >
            <Icon
              ml={'19px'}
              viewBox="0 0 15 15"
              fill={'#24282C'}
              w={'15px'}
              h="15px"
              onClick={() => router.push('/')}
            >
              <path d="M9.1875 13.1875L3.92187 7.9375C3.85937 7.875 3.81521 7.80729 3.78937 7.73438C3.76312 7.66146 3.75 7.58333 3.75 7.5C3.75 7.41667 3.76312 7.33854 3.78937 7.26562C3.81521 7.19271 3.85937 7.125 3.92187 7.0625L9.1875 1.79687C9.33333 1.65104 9.51562 1.57812 9.73438 1.57812C9.95312 1.57812 10.1406 1.65625 10.2969 1.8125C10.4531 1.96875 10.5312 2.15104 10.5312 2.35938C10.5312 2.56771 10.4531 2.75 10.2969 2.90625L5.70312 7.5L10.2969 12.0938C10.4427 12.2396 10.5156 12.4192 10.5156 12.6325C10.5156 12.8463 10.4375 13.0312 10.2812 13.1875C10.125 13.3438 9.94271 13.4219 9.73438 13.4219C9.52604 13.4219 9.34375 13.3438 9.1875 13.1875Z" />
            </Icon>
            <Text ml="4px" onClick={() => router.push('/')}>
              {t('Application List')}
            </Text>
          </Flex>
          <Text px="6px">/</Text>
          <Text
            onClick={copyTemplateLink}
            _hover={{ fill: '#219BF4', color: '#219BF4' }}
            color={router.pathname === '/deploy' ? '#262A32' : '#7B838B'}
          >
            {data?.templateYaml?.metadata?.name}
          </Text>
        </Flex>
      </Flex>
      <Flex px="42px" pb="36px" flexDirection={'column'} alignItems={'center'} minWidth={'780px'}>
        <Flex
          mt={'32px'}
          flexDirection={'column'}
          width={'100%'}
          flexGrow={1}
          backgroundColor={'rgba(255, 255, 255, 0.90)'}
        >
          <Header
            cloudDomain={platformEnvs?.DESKTOP_DOMAIN || ''}
            templateDetail={data?.templateYaml!}
            appName={appName || ''}
            title={title}
            yamlList={yamlList}
            applyBtnText={insideCloud ? applyBtnText : 'Deploy on sealos'}
            applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
          />
          <Flex w="100%" mt="32px" flexDirection="column">
            {/* <QuotaBox /> */}
            <Form
              formHook={formHook}
              pxVal={pxVal}
              formSource={templateSource!}
              platformEnvs={platformEnvs!}
            />
            {/* <Yaml yamlList={yamlList} pxVal={pxVal}></Yaml> */}
            <ReadMe key={readUrl} readUrl={readUrl} readmeContent={readmeContent} />
          </Flex>
        </Flex>
      </Flex>
      <ConfirmChild />
      <ConfirmChild2 />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </Box>
  );
}

async function fetchReadmeContent(url: string): Promise<string> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/markdown,text/plain,*/*',
          'Content-Type': 'text/markdown; charset=UTF-8',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'User-Agent': 'Mozilla/5.0'
        },
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (err) {
      retryCount++;

      if (retryCount === maxRetries) {
        return '';
      }
      await new Promise((resolve) => setTimeout(resolve, retryCount * 1000));
    }
  }
  return '';
}

export async function getServerSideProps(content: any) {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos';
  const local =
    content?.req?.cookies?.NEXT_LOCALE ||
    compareFirstLanguages(content?.req?.headers?.['accept-language'] || 'zh');
  const appName = content?.query?.templateName || '';
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;

  content?.res.setHeader(
    'Set-Cookie',
    `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`
  );

  try {
    const { data: templateSource } = await (
      await fetch(`${baseurl}/api/getTemplateSource?templateName=${appName}`)
    ).json();

    const templateDetail = templateSource?.templateYaml;
    const metaData = {
      title: templateDetail?.spec?.title || '',
      keywords: templateDetail?.spec?.description || '',
      description: templateDetail?.spec?.description || ''
    };

    const readUrl =
      templateDetail?.spec?.i18n?.[local]?.readme || templateDetail?.spec?.readme || '';
    const readmeContent = readUrl ? await fetchReadmeContent(readUrl) : '';

    return {
      props: {
        appName,
        metaData,
        brandName,
        readmeContent,
        readUrl,
        ...(await serviceSideProps(content))
      }
    };
  } catch (error) {
    console.log('Error in getServerSideProps:', error);

    return {
      props: {
        appName,
        metaData: { title: appName, keywords: '', description: '' },
        brandName,
        readmeContent: '',
        readUrl: '',
        ...(await serviceSideProps(content))
      }
    };
  }
}
