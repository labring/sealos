import { postDeployApp } from '@/api/app';
import { getPlatformEnv } from '@/api/platform';
import MyIcon from '@/components/Icon';
import { editModeMap } from '@/constants/editApp';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { YamlItemType } from '@/types';
import { TemplateSourceType, TemplateType } from '@/types/app';
import { EnvResponse } from '@/types/index';
import { serviceSideProps } from '@/utils/i18n';
import {
  developGenerateYamlList,
  handleTemplateToInstanceYaml,
  parseTemplateString,
  getYamlSource
} from '@/utils/json-yaml';
import { getTemplateInputDefaultValues, getTemplateValues } from '@/utils/template';
import { downLoadBold } from '@/utils/tools';
import { Button, Center, Flex, Spinner, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { debounce, has, isObject, mapValues } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ErrorModal from '../deploy/components/ErrorModal';
import BreadCrumbHeader from './components/BreadCrumbHeader';
import Form from './components/Form';
import YamlList from './components/YamlList';
import Editor from './components/Editor';
import { useCachedStore } from '@/store/cached';

export default function Develop() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [templateSource, setTemplateSource] = useState<TemplateSourceType>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const { Loading, setIsLoading } = useLoading();
  const [errorMessage, setErrorMessage] = useState('');
  const { applySuccess, applyError } = editModeMap(false);
  const SuccessfulDryRun = useRef(false);
  const { insideCloud, setInsideCloud } = useCachedStore();
  const { data: platformEnvs } = useQuery(
    ['getPlatformEnvs'],
    () => getPlatformEnv({ insideCloud }),
    {
      retry: 3
    }
  );

  const generateYamlData = useCallback(
    (yamlSource: TemplateSourceType, inputs: Record<string, string> = {}): YamlItemType[] => {
      const { defaults, defaultInputs } = getTemplateValues(yamlSource);
      const data = {
        ...platformEnvs,
        ...yamlSource?.source,
        inputs: {
          ...defaultInputs,
          ...inputs
        },
        defaults: defaults
      };
      const generateStr = parseTemplateString(yamlSource.appYaml, data);
      const _instanceName = yamlSource?.source?.defaults?.app_name?.value || '';
      return developGenerateYamlList(generateStr, _instanceName);
    },
    [platformEnvs]
  );

  const parseTemplate = useCallback(
    (str: string) => {
      if (!str || !str.trim()) {
        setTemplateSource(void 0);
        setYamlList([]);
        return;
      }
      try {
        const result = getYamlSource(str, platformEnvs);
        const formInputs = formHook.getValues();
        setTemplateSource(result);
        const correctYamlList = generateYamlData(result, formInputs);
        setYamlList(correctYamlList);
      } catch (error: any) {
        toast({
          title: 'Parsing Yaml Error',
          status: 'error',
          description: <pre style={{ whiteSpace: 'pre-wrap' }}>{error?.message}</pre>,
          duration: 4000,
          isClosable: true
        });
      }
    },
    [platformEnvs, generateYamlData]
  );

  const onYamlChange = useCallback(
    debounce((doc: string) => {
      parseTemplate(doc);
    }, 1000),
    [parseTemplate]
  );

  // form
  const formHook = useForm({
    defaultValues: getTemplateInputDefaultValues(templateSource)
  });

  const formOnchangeDebounce = useCallback(
    debounce((formInputData: Record<string, string>) => {
      try {
        if (templateSource) {
          const correctYamlList = generateYamlData(templateSource, formInputData);
          setYamlList(correctYamlList);
        }
      } catch (error) {
        console.log(error);
      }
    }, 500),
    [templateSource, generateYamlData]
  );

  // watch form change, compute new yaml
  useEffect(() => {
    const subscription = formHook.watch((data: Record<string, string>) => {
      data && formOnchangeDebounce(data);
    });
    return () => subscription.unsubscribe();
  }, [formHook, formOnchangeDebounce]);

  const submitSuccess = async () => {
    setIsLoading(true);
    try {
      const result: string[] = await postDeployApp(
        yamlList.map((item) => item.value),
        'dryrun'
      );
      if (result.length > 0) {
        SuccessfulDryRun.current = true;
      }
      toast({
        title: t(applySuccess),
        status: 'success',
        description: result?.toString()
      });
    } catch (error) {
      console.log(error, '===apply err===');

      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = () => {
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

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [yamlList]);

  const formalApply = async () => {
    setIsLoading(true);
    try {
      if (yamlList.length !== 0 && SuccessfulDryRun.current) {
        const result: string[] = await postDeployApp(yamlList.map((item) => item.value));
        toast({
          title: t('Deployment successful, please go to My Application to view') || ' ',
          status: 'success'
        });
      }
    } catch (error) {
      console.log(error, 'FormalApply');
    }
    setIsLoading(false);
  };

  return (
    <Flex flexDirection={'column'} p={'0px 34px 20px 34px '} h="100vh" maxW={'1440px'} mx="auto">
      <BreadCrumbHeader
        applyCb={() => formHook.handleSubmit(submitSuccess, submitError)()}
        isShowBtn={SuccessfulDryRun.current}
        applyFormalCb={formalApply}
      />
      <Flex
        border={'1px solid #DEE0E2'}
        borderRadius={'8px'}
        overflowY={'hidden'}
        overflowX={'scroll'}
        flex={1}
      >
        {/* left */}
        <Flex flexDirection={'column'} w="50%" borderRight={'1px solid #EFF0F1'}>
          <Flex
            flexShrink={0}
            borderBottom={'1px solid #EFF0F1'}
            h="48px"
            alignItems={'center'}
            backgroundColor={'#F8FAFB'}
            px="36px"
            borderRadius={'8px 8px 0px 0px '}
          >
            <MyIcon name="dev" color={'#24282C'} w={'24px'} h={'24px'}></MyIcon>
            <Text fontWeight={'500'} fontSize={'16px'} color={'#24282C'} ml="8px">
              {t('develop.Development')}
            </Text>
            <Text color={'#5A646E'} fontSize={'14px'} fontWeight={400} ml="auto">
              {t('develop.Please enter YAML code')}
            </Text>
          </Flex>
          {platformEnvs && (
            <Editor
              h="100%"
              w="100%"
              position={'relative'}
              overflow={'auto'}
              onDocChange={onYamlChange}
            />
          )}
        </Flex>
        {/* right */}
        <Flex w="50%" flexDirection={'column'} position={'relative'}>
          <Flex
            flexShrink={0}
            borderBottom={'1px solid #EFF0F1'}
            h="48px"
            alignItems={'center'}
            backgroundColor={'#F8FAFB'}
            pl="42px"
            borderRadius={'8px 8px 0px 0px '}
          >
            <MyIcon name="eyeShow" color={'#24282C'} w={'24px'} h={'24px'}></MyIcon>
            <Text fontWeight={'500'} fontSize={'16px'} color={'#24282C'} ml="8px">
              {t('develop.Preview')}
            </Text>
          </Flex>
          <Flex flexDirection={'column'} flex={1} overflow={'scroll'}>
            <Flex
              pl="42px"
              pt="26px"
              pr={{ sm: '20px', md: '60px' }}
              borderBottom={'1px solid #EFF0F1'}
              flexDirection={'column'}
            >
              <Text fontWeight={'500'} fontSize={'18px'} color={'#24282C'}>
                {t('develop.Configure Form')}
              </Text>
              <Form formSource={templateSource!} formHook={formHook} platformEnvs={platformEnvs!} />
            </Flex>
            <Flex flex={1} pl="42px" pt="26px" flexDirection={'column'} position={'relative'}>
              <Flex alignItems={'center'} justifyContent={'space-between'}>
                <Text fontWeight={'500'} fontSize={'18px'} color={'#24282C'} cursor={'default'}>
                  {t('develop.YAML File')}
                </Text>
                <Button
                  ml="auto"
                  minW={'100px'}
                  h={'34px'}
                  variant={'link'}
                  onClick={handleExportYaml}
                >
                  {t('Export')} Yaml
                </Button>
              </Flex>
              <YamlList yamlList={yamlList} />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
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
