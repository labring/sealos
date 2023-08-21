import { getTemplate, postDeployApp } from '@/api/app';
import MyIcon from '@/components/Icon';
import { editModeMap } from '@/constants/editApp';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { GET } from '@/services/request';
import { useCachedStore } from '@/store/cached';
import { useGlobalStore } from '@/store/global';
import type { QueryType, YamlItemType } from '@/types';
import { TemplateSource, TemplateType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import { processEnvValue } from '@/utils/tools';
import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import JSYAML from 'js-yaml';
import { has, isObject, mapValues, reduce } from 'lodash';
import debounce from 'lodash/debounce';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { sealosApp } from 'sealos-desktop-sdk/app';
import Form from './components/Form';
import ReadMe from './components/ReadMe';
import Yaml from './components/Yaml';

const ErrorModal = dynamic(() => import('./components/ErrorModal'));
const Header = dynamic(() => import('./components/Header'), { ssr: false });

const EditApp = ({ appName, tabType }: { appName?: string; tabType: string }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { templateName } = router.query as QueryType;
  const { Loading, setIsLoading } = useLoading();
  const [forceUpdate, setForceUpdate] = useState(false);
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(!!appName);
  const [templateSource, setTemplateSource] = useState<TemplateSource>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const [correctYaml, setCorrectYaml] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { screenWidth } = useGlobalStore();
  const { setCached, cached, insideCloud, deleteCached, setInsideCloud } = useCachedStore();

  const detailName = useMemo(
    () => templateSource?.source?.defaults?.app_name?.value || '',
    [templateSource]
  );

  const { data: FastDeployTemplates } = useQuery(['cloneTemplte'], () => GET('/api/listTemplate'));

  const { data: platformEnvs } = useQuery(['getPlatformEnvs'], () => GET('/api/platform/getEnv'));

  const templateDetail: TemplateType = FastDeployTemplates?.find(
    (item: TemplateType) => item?.metadata?.name === templateName
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

  const getFormDefaultValues = (templateSource: TemplateSource | undefined) => {
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

      const yamlString = templateSource.yamlList?.map((item) => JSYAML.dump(item)).join('---\n');
      const output = mapValues(templateSource?.source.defaults, (value) => value.value);

      const generateStr = parseTemplateString(yamlString, /\$\{\{\s*(.*?)\s*\}\}/g, {
        ...templateSource?.source,
        inputs: data,
        defaults: output
      });
      setCorrectYaml(generateStr);
      setYamlList(generateYamlList(generateStr, detailName));
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
        const _domain = platformEnvs.SEALOS_CLOUD_DOMAIN;
        const href = `https://${_domain}/?openapp=system-fastdeploy${_name}`;
        return window.open(href, '_self');
      }

      const detailName = templateSource?.source?.defaults?.app_name?.value;

      const yamls = JSYAML.loadAll(correctYaml).map((item: any) => {
        let _item = processEnvValue(item, detailName!);
        return JSYAML.dump(_item);
      });

      const result = await postDeployApp(yamls);

      toast({
        title: t(applySuccess),
        status: 'success'
      });

      deleteCached();

      openConfirm2(() => {
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-applaunchpad',
          pathname: '/app/detail',
          query: { name: detailName },
          messageData: {}
        });
      })();
    } catch (error) {
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = () => {
    formHook.getValues();
    function deepSearch(obj: any): string {
      if (has(obj, 'message')) {
        return obj.message;
      }
      for (let key in obj) {
        if (isObject(obj[key])) {
          let message = deepSearch(obj[key]);
          if (message) {
            return message;
          }
        }
      }
      return t('Submit Error');
    }

    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  };

  const getTemplateData = async () => {
    if (!templateName) {
      toast({
        title: t('TemplateNameError'),
        status: 'error',
        position: 'top',
        duration: 3000,
        isClosable: true
      });
      return null;
    }
    const res: TemplateSource = await getTemplate(templateName);
    setTemplateSource(res);
    try {
      const yamlString = res.yamlList?.map((item) => JSYAML.dump(item)).join('---\n');
      const output = mapValues(res?.source.defaults, (value) => value.value);

      const generateStr = parseTemplateString(yamlString, /\$\{\{\s*(.*?)\s*\}\}/g, {
        ...res?.source,
        defaults: output,
        inputs: getCachedValue() ? JSON.parse(cached) : getFormDefaultValues(res)
      });

      setCorrectYaml(generateStr);
      setYamlList(generateYamlList(generateStr, detailName));
    } catch (err) {
      console.log(err, 'getTemplateData');
    }
  };

  useEffect(() => {
    setInsideCloud(!(window.top === window));

    (async () => {
      try {
        await getTemplateData();
      } catch (error) {}
    })();
  }, []);

  return (
    <>
      <Flex flexDirection={'column'} alignItems={'center'} h={'100%'} minWidth={'1024px'}>
        <Flex
          zIndex={99}
          position={'fixed'}
          top={0}
          left={0}
          w={'100%'}
          h={'50px'}
          borderBottom={'1px solid #DEE0E2'}
          justifyContent={'start'}
          alignItems={'center'}
          backgroundColor={'rgba(255, 255, 255)'}
          backdropBlur={'100px'}
        >
          <Box cursor={'pointer'} onClick={() => router.push('/')}>
            <MyIcon ml={'46px'} name="arrowLeft" color={'#24282C'} w={'16px'} h={'16px'}></MyIcon>
          </Box>
          <Breadcrumb
            ml={'14px'}
            fontWeight={500}
            fontSize={16}
            textDecoration={'none'}
            color={'#7B838B'}
          >
            <BreadcrumbItem textDecoration={'none'}>
              <BreadcrumbLink _hover={{ color: '#219BF4', textDecoration: 'none' }} href="/">
                {t('Template List')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem color={'#262A32'} isCurrentPage={router.pathname === 'deploy'}>
              <BreadcrumbLink _hover={{ color: '#219BF4', textDecoration: 'none' }} href="#">
                {templateDetail?.metadata?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </Flex>

        <Flex
          mt={'50px'}
          flexDirection={'column'}
          width={'100%'}
          flexGrow={1}
          backgroundColor={'rgba(255, 255, 255, 0.90)'}
        >
          <Header
            templateDetail={templateDetail}
            appName={''}
            title={title}
            yamlList={yamlList}
            applyBtnText={insideCloud ? applyBtnText : 'Deploy on sealos'}
            applyCb={() => formHook.handleSubmit(openConfirm(submitSuccess), submitError)()}
          />
          <Flex w={{ md: '1000px', base: '800px' }} m={'32px auto'} flexDirection="column">
            <Form formHook={formHook} pxVal={pxVal} formSource={templateSource?.source} />
            {/* <Yaml yamlList={yamlList} pxVal={pxVal}></Yaml> */}
            <ReadMe templateDetail={templateDetail} />
          </Flex>
        </Flex>
      </Flex>
      <ConfirmChild />
      <ConfirmChild2 />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </>
  );
};

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';
  const tabType = content?.query?.type || 'form';

  return {
    props: {
      appName,
      tabType,
      ...(await serviceSideProps(content))
    }
  };
}

export default EditApp;
