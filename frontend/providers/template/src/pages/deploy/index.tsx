import { getTemplateSource, postDeployApp } from '@/api/app';
import { getPlatformEnv } from '@/api/platform';
import { editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
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
import JSYAML from 'js-yaml';
import { mapValues, reduce } from 'lodash';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Form from './components/Form';
import ReadMe from './components/ReadMe';

const ErrorModal = dynamic(() => import('./components/ErrorModal'));
const Header = dynamic(() => import('./components/Header'), { ssr: false });

export default function EditApp({ appName }: { appName?: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { copyData } = useCopyData();
  const { templateName } = router.query as QueryType;
  const { Loading, setIsLoading } = useLoading();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(false);
  const [templateSource, setTemplateSource] = useState<TemplateSourceType>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const { screenWidth } = useGlobalStore();
  const { setCached, cached, insideCloud, deleteCached, setInsideCloud } = useCachedStore();
  const { setAppType } = useSearchStore();

  const detailName = useMemo(
    () => templateSource?.source?.defaults?.app_name?.value || '',
    [templateSource]
  );

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

  const getFormDefaultValues = (templateSource: TemplateSourceType | undefined) => {
    const inputs = templateSource?.source?.inputs;
    return reduce(
      inputs,
      (acc, item) => {
        // @ts-ignore
        acc[item.key] = item.default;
        return acc;
      },
      {}
    );
  };

  const formOnchangeDebounce = debounce((data: any) => {
    try {
      if (!templateSource) return;
      const app_name = templateSource?.source?.defaults?.app_name?.value;

      const yamlString = templateSource.yamlList
        ?.map((item) => {
          // if (item?.kind === 'Instance') {
          //   const _temp: TemplateInstanceType = cloneDeep(item);
          //   _temp.spec.defaults = templateSource?.source?.defaults;
          //   _temp.spec.inputs = isEmpty(data) ? null : data;
          //   console.log(_temp, templateSource?.source?.defaults, data);
          //   return JSYAML.dump(_temp);
          // }
          return JSYAML.dump(item);
        })
        .join('---\n');
      const output = mapValues(templateSource?.source.defaults, (value) => value.value);
      const generateStr = parseTemplateString(yamlString, /\$\{\{\s*(.*?)\s*\}\}/g, {
        ...templateSource?.source,
        inputs: data,
        defaults: output
      });
      setYamlList(generateYamlList(generateStr, app_name));
    } catch (error) {
      console.log(error);
    }
  }, 200);

  const getCachedValue = () => {
    if (!cached) return null;
    const cachedValue = JSON.parse(cached);
    return cachedValue?.cachedKey === templateName ? cachedValue : null;
  };

  // form
  const formHook = useForm({
    defaultValues: getFormDefaultValues(templateSource),
    values: getCachedValue()
  });

  // watch form change, compute new yaml
  formHook.watch((data: any) => {
    data && formOnchangeDebounce(data);
    setForceUpdate(!forceUpdate);
  });

  const submitSuccess = async () => {
    setIsLoading(true);
    try {
      if (!insideCloud) {
        setIsLoading(false);
        setCached(JSON.stringify({ ...formHook.getValues(), cachedKey: templateName }));
        const _name = encodeURIComponent(`?templateName=${templateName}&sealos_inside=true`);
        const _domain = platformEnvs?.SEALOS_CLOUD_DOMAIN;
        const href = `https://${_domain}/?openapp=system-template${_name}`;
        return window.open(href, '_self');
      }
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
        query: {
          instanceName: detailName
        }
      });
    } catch (error) {
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
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

  const handleTemplateSource = (res: TemplateSourceType) => {
    try {
      setTemplateSource(res);
      const app_name = res?.source?.defaults?.app_name?.value;
      const _defaults = mapValues(res?.source.defaults, (value) => value.value);
      const _inputs = getCachedValue() ? JSON.parse(cached) : getFormDefaultValues(res);
      const yamlString = res.yamlList
        ?.map((item) => {
          // if (item?.kind === 'Instance') {
          //   const _temp: TemplateInstanceType = cloneDeep(item);
          //   _temp.spec.defaults = res.source.defaults;
          //   _temp.spec.inputs = isEmpty(_inputs) ? null : _inputs;
          //   console.log(_temp, res?.source.defaults, _inputs);
          //   return JSYAML.dump(_temp);
          // }
          return JSYAML.dump(item);
        })
        .join('---\n');

      const generateStr = parseTemplateString(yamlString, /\$\{\{\s*(.*?)\s*\}\}/g, {
        ...res?.source,
        defaults: _defaults,
        inputs: _inputs
      });
      // console.log(generateStr, '------');
      setYamlList(generateYamlList(generateStr, app_name));
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
        handleTemplateSource(data);
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
    const str = `https://${platformEnvs?.SEALOS_CLOUD_DOMAIN}/?openapp=system-template%3FtemplateName%3D${appName}`;
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
            cloudDomain={platformEnvs?.SEALOS_CLOUD_DOMAIN || ''}
            templateDetail={data?.templateYaml!}
            appName={appName || ''}
            title={title}
            yamlList={yamlList}
            applyBtnText={insideCloud ? applyBtnText : 'Deploy on sealos'}
            applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
          />
          <Flex w="100%" mt="32px" flexDirection="column">
            <Form formHook={formHook} pxVal={pxVal} formSource={templateSource?.source} />
            {/* <Yaml yamlList={yamlList} pxVal={pxVal}></Yaml> */}
            <ReadMe templateDetail={data?.templateYaml!} />
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

export async function getServerSideProps(content: any) {
  const local =
    content?.req?.cookies?.NEXT_LOCALE ||
    compareFirstLanguages(content?.req?.headers?.['accept-language'] || 'zh');

  content?.res.setHeader(
    'Set-Cookie',
    `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`
  );

  const appName = content?.query?.templateName || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}
