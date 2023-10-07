import MyIcon from '@/components/Icon';
import { editModeMap } from '@/constants/editApp';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { GET } from '@/services/request';
import { YamlItemType } from '@/types';
import { TemplateType, TemplateSourceType } from '@/types/app';
import { serviceSideProps } from '@/utils/i18n';
import {
  developGenerateYamlList,
  getTemplateDataSource,
  parseTemplateString
} from '@/utils/json-yaml';
import { getTemplateDefaultValues } from '@/utils/template';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { useQuery } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import JsYaml from 'js-yaml';
import { debounce, has, isObject, mapValues } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import ErrorModal from '../deploy/components/ErrorModal';
import BreadCrumbHeader from './components/BreadCrumbHeader';
import Form from './components/Form';
import YamlList from './components/YamlList';
import { postDeployApp } from '@/api/app';
import JSZip from 'jszip';
import { downLoadBold } from '@/utils/tools';
import dayjs from 'dayjs';

export default function Develop() {
  const { t } = useTranslation();
  const [yamlValue, setYamlValue] = useState('');
  const { toast } = useToast();
  const [yamlSource, setYamlSource] = useState<TemplateSourceType>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const { Loading, setIsLoading } = useLoading();
  const [errorMessage, setErrorMessage] = useState('');
  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(false);

  const detailName = useMemo(
    () => yamlSource?.source?.defaults?.app_name?.value || '',
    [yamlSource?.source?.defaults?.app_name?.value]
  );

  const { data: platformEnvs } = useQuery(['getPlatformEnvs'], () => GET('/api/platform/getEnv'));

  const onYamlChange = (value: string) => {
    setYamlValue(value);
    parseTemplate(value);
  };

  const getYamlSource = (str: string): TemplateSourceType => {
    const yamlData = JsYaml.loadAll(str);
    const templateYaml: TemplateType = yamlData.find(
      (item: any) => item.kind === 'Template'
    ) as TemplateType;
    const yamlList = yamlData.filter((item: any) => item.kind !== 'Template');
    const dataSource = getTemplateDataSource(templateYaml);
    const result: TemplateSourceType = {
      source: {
        ...dataSource,
        ...platformEnvs
      },
      yamlList: yamlList,
      templateYaml: templateYaml
    };
    return result;
  };

  const generateCorrectYaml = (yamlSource: TemplateSourceType, inputsForm = {}) => {
    const yamlString = yamlSource?.yamlList?.map((item) => JsYaml.dump(item)).join('---\n');
    const output = mapValues(yamlSource?.source.defaults, (value) => value.value);
    const generateStr = parseTemplateString(yamlString, /\$\{\{\s*(.*?)\s*\}\}/g, {
      ...yamlSource?.source,
      inputs: inputsForm,
      defaults: output
    });
    return generateStr;
  };

  const parseTemplate = (str: string) => {
    try {
      const result = getYamlSource(str);
      const defaultInputes = getTemplateDefaultValues(result);
      setYamlSource(result);
      const correctYaml = generateCorrectYaml(result, defaultInputes);
      setYamlList(developGenerateYamlList(correctYaml, detailName));
    } catch (error: any) {
      toast({
        title: 'Parsing Yaml Error',
        status: 'error',
        description: <pre style={{ whiteSpace: 'pre-wrap' }}>{error?.message}</pre>,
        duration: 4000,
        isClosable: true
      });
    }
  };

  // form
  const formHook = useForm({
    defaultValues: getTemplateDefaultValues(yamlSource)
  });

  // watch form change, compute new yaml
  formHook.watch((data: any) => {
    data && formOnchangeDebounce(data);
  });

  const formOnchangeDebounce = debounce((data: any) => {
    try {
      if (yamlSource) {
        const correctYaml = generateCorrectYaml(yamlSource, data);
        setYamlList(developGenerateYamlList(correctYaml, detailName));
      }
    } catch (error) {
      console.log(error);
    }
  }, 1000);

  const submitSuccess = async () => {
    setIsLoading(true);
    try {
      const result: string[] = await postDeployApp(
        yamlList.map((item) => item.value),
        'dryrun'
      );
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

  const handleExportYaml = useCallback(async () => {
    const exportYamlString = yamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [yamlList]);

  return (
    <Flex flexDirection={'column'} p={'0px 34px 20px 34px '} h="100vh" maxW={'1440px'} mx="auto">
      <BreadCrumbHeader applyCb={() => formHook.handleSubmit(submitSuccess, submitError)()} />
      <Flex
        border={'1px solid #DEE0E2'}
        borderRadius={'8px'}
        overflowY={'hidden'}
        overflowX={'scroll'}
        flex={1}>
        {/* left */}
        <Flex flexDirection={'column'} w="50%" borderRight={'1px solid #EFF0F1'}>
          <Flex
            flexShrink={0}
            borderBottom={'1px solid #EFF0F1'}
            h="48px"
            alignItems={'center'}
            backgroundColor={'#F8FAFB'}
            px="36px"
            borderRadius={'8px 8px 0px 0px '}>
            <MyIcon name="dev" color={'#24282C'} w={'24px'} h={'24px'}></MyIcon>
            <Text fontWeight={'500'} fontSize={'16px'} color={'#24282C'} ml="8px">
              {t('develop.Development')}
            </Text>
            <Text color={'#5A646E'} fontSize={'14px'} fontWeight={400} ml="auto">
              {t('develop.Please enter YAML code')}
            </Text>
          </Flex>
          <Box h="100%" w="100%" position={'relative'} overflow={'auto'}>
            <CodeMirror
              extensions={[StreamLanguage.define(yaml)]}
              width="100%"
              height="100%"
              minHeight="1200px"
              onChange={debounce(onYamlChange, 1000)}
            />
          </Box>
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
            borderRadius={'8px 8px 0px 0px '}>
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
              flexDirection={'column'}>
              <Text fontWeight={'500'} fontSize={'18px'} color={'#24282C'}>
                {t('develop.Configure Form')}
              </Text>
              <Form formSource={yamlSource!} formHook={formHook} />
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
                  onClick={handleExportYaml}>
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
