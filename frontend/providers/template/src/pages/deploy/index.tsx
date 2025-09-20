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
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import ReadMe from './components/ReadMe';
import { getTemplateInputDefaultValues, getTemplateValues } from '@/utils/template';
import { getResourceUsage } from '@/utils/usage';
import Head from 'next/head';
import { useMessage } from '@sealos/ui';
import { ResponseCode } from '@/types/response';
import { useGuideStore } from '@/store/guide';
import { useSystemConfigStore } from '@/store/config';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { useUserStore } from '@/store/user';
import useSessionStore from '@/store/session';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';

const ErrorModal = dynamic(() => import('./components/ErrorModal'));
const Header = dynamic(() => import('./components/Header'), { ssr: false });

export default function EditApp({
  appName,
  metaData,
  brandName,
  initTemplateData
}: {
  appName?: string;
  metaData: {
    title: string;
    keywords: string;
    description: string;
  };
  brandName?: string;
  initTemplateData: TemplateSourceType;
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
  const [errorCode, setErrorCode] = useState<ResponseCode>();
  const { screenWidth } = useGlobalStore();
  const { setCached, cached, insideCloud, deleteCached, setInsideCloud } = useCachedStore();
  const { setEnvs } = useSystemConfigStore();
  const { setAppType } = useSearchStore();
  const { loadUserQuota, checkExceededQuotas } = useUserStore();
  const { getSession } = useSessionStore();

  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  // load user quota on component mount
  useEffect(() => {
    if (quotaLoaded) return;

    loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, loadUserQuota]);

  const detailName = useMemo(
    () => templateSource?.source?.defaults?.app_name?.value || '',
    [templateSource]
  );

  const { data: platformEnvs } = useQuery(
    ['getPlatformEnvs'],
    () => getPlatformEnv({ insideCloud }),
    {
      onSuccess(data) {
        setEnvs(data);
      },
      retry: 3
    }
  );

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

  const debouncedFnRef = useRef<any>(null);
  useEffect(() => {
    debouncedFnRef.current = debounce((inputValues: Record<string, string>) => {
      try {
        if (!templateSource) return;
        const list = generateYamlData(templateSource, inputValues);
        setYamlList(list);
      } catch (error) {
        console.log(error);
      }
    }, 500);
    return () => {
      debouncedFnRef.current = null;
    };
  }, [templateSource, generateYamlData]);

  const formOnchangeDebounce = useCallback((inputs: Record<string, string>) => {
    if (debouncedFnRef.current) {
      debouncedFnRef.current(inputs);
    }
  }, []);

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

  const { createCompleted } = useGuideStore();

  const handleOutside = useCallback(() => {
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
  }, [router, templateName, platformEnvs, setCached, formHook]);

  const handleInside = useCallback(async () => {
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
  }, [applySuccess, yamlList, deleteCached, setAppType, router, detailName, t, toast]);

  const submitError = useCallback(async () => {
    await formHook.trigger();
    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  }, [formHook, toast]);

  const submitSuccess = useCallback(async () => {
    if (!createCompleted) {
      return router.push('/instance?instanceName=fastgpt-mock');
    }

    setIsLoading(true);

    try {
      if (!insideCloud) {
        handleOutside();
      } else {
        await handleInside();
      }
    } catch (error: any) {
      if (error?.code === ResponseCode.BALANCE_NOT_ENOUGH) {
        setErrorMessage(t('user_balance_not_enough'));
        setErrorCode(ResponseCode.BALANCE_NOT_ENOUGH);
      } else if (error?.code === ResponseCode.FORBIDDEN_CREATE_APP) {
        setErrorMessage(t('forbidden_create_app'));
        setErrorCode(ResponseCode.FORBIDDEN_CREATE_APP);
      } else if (error?.code === ResponseCode.APP_ALREADY_EXISTS) {
        setErrorMessage(t('app_already_exists'));
        setErrorCode(ResponseCode.APP_ALREADY_EXISTS);
      } else {
        setErrorMessage(JSON.stringify(error));
      }
    }
    setIsLoading(false);
  }, [insideCloud, createCompleted, setIsLoading, t, router, handleOutside, handleInside]);

  const usage = useMemo(() => {
    const usage = getResourceUsage(yamlList?.map((item) => item.value) || []);
    return usage;
  }, [yamlList]);

  const handleCreateApp = useCallback(() => {
    // Check quota before creating app
    const exceededQuotaItems = checkExceededQuotas({
      cpu: usage.cpu.max,
      memory: usage.memory.max,
      nodeport: usage.nodeport,
      storage: usage.storage.max,
      ...(getSession().subscription?.type === 'PAYG' ? {} : { traffic: 1 })
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      formHook.handleSubmit(openConfirm(submitSuccess), submitError)();
    }
  }, [checkExceededQuotas, usage, getSession, openConfirm, submitSuccess, submitError, formHook]);

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
      initialData: initTemplateData,
      enabled: !!initTemplateData,
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
            applyCb={handleCreateApp}
          />
          <Flex w="100%" mt="32px" flexDirection="column">
            <Form
              formHook={formHook}
              pxVal={pxVal}
              formSource={templateSource!}
              platformEnvs={platformEnvs!}
            />
            {/* <Yaml yamlList={yamlList} pxVal={pxVal}></Yaml> */}
            <ReadMe
              key={templateSource?.readUrl || 'readme_url'}
              readUrl={templateSource?.readUrl || ''}
              readmeContent={templateSource?.readmeContent || ''}
            />
          </Flex>
        </Flex>
      </Flex>
      <ConfirmChild />
      <ConfirmChild2 />
      <Loading />
      <InsufficientQuotaDialog
        items={exceededQuotas}
        showControls={false}
        open={exceededDialogOpen}
        onOpenChange={setExceededDialogOpen}
        onConfirm={() => {}}
      />
      {!!errorMessage && (
        <ErrorModal
          title={applyError}
          content={errorMessage}
          errorCode={errorCode}
          onClose={() => setErrorMessage('')}
        />
      )}
    </Box>
  );
}

export async function getServerSideProps(content: any) {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos';
  const locale =
    content?.req?.cookies?.NEXT_LOCALE ||
    compareFirstLanguages(content?.req?.headers?.['accept-language'] || 'zh');
  const appName = content?.query?.templateName || '';
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;

  content?.res.setHeader(
    'Set-Cookie',
    `NEXT_LOCALE=${locale}; Max-Age=2592000; Secure; SameSite=None`
  );

  try {
    const { data: templateSource } = await (
      await fetch(
        `${baseurl}/api/getTemplateSource?templateName=${appName}&locale=${locale}&includeReadme=true`
      )
    ).json();

    const templateDetail = templateSource?.templateYaml;
    const metaData = {
      title: templateDetail?.spec?.title || '',
      keywords: templateDetail?.spec?.description || '',
      description: templateDetail?.spec?.description || ''
    };

    return {
      props: {
        initTemplateData: templateSource,
        appName,
        metaData,
        brandName,
        ...(await serviceSideProps(content))
      }
    };
  } catch (error) {
    console.log('Error in getServerSideProps:', error);

    return {
      props: {
        initTemplateData: null,
        appName,
        metaData: { title: appName, keywords: '', description: '' },
        brandName,
        ...(await serviceSideProps(content))
      }
    };
  }
}
