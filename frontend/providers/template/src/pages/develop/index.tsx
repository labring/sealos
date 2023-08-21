import { Flex, Box, Button, Text, Textarea } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import MyIcon from '@/components/Icon';
import { useRouter } from 'next/router';
import { ChangeEvent, useMemo, useState } from 'react';
import { serviceSideProps } from '@/utils/i18n';
import Form from './components/Form';
import { useQuery } from '@tanstack/react-query';
import { GET } from '@/services/request';
import JsYaml from 'js-yaml';
import { useToast } from '@/hooks/useToast';
import { debounce, mapValues } from 'lodash';
import { YamlSourceType, TemplateType, YamlType } from '@/types/app';
import {
  developGenerateYamlList,
  getTemplateDataSource,
  parseTemplateString
} from '@/utils/json-yaml';
import YamlList from './components/YamlList';
import { useForm } from 'react-hook-form';
import { getTemplateDefaultValues } from '@/utils/template';
import { YamlItemType } from '@/types';
import Header from './components/Header';
import BreadCrumbHeader from './components/BreadCrumbHeader';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { useGlobalStore } from '@/store/global';

const Develop = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [yamlValue, setYamlValue] = useState('');
  const { toast } = useToast();
  const [yamlSource, setYamlSource] = useState<YamlSourceType>();
  const [yamlList, setYamlList] = useState<YamlItemType[]>([]);
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1024, [screenWidth]);
  const [showSlider, setShowSlider] = useState(false);

  const detailName = useMemo(
    () => yamlSource?.source?.defaults?.app_name?.value || '',
    [yamlSource?.source?.defaults?.app_name?.value]
  );

  const { data: platformEnvs } = useQuery(['getPlatformEnvs'], () => GET('/api/platform/getEnv'));

  const onYamlChange = (value: string) => {
    setYamlValue(value);
    parseTemplate(value);
  };

  const getYamlSource = (str: string): YamlSourceType => {
    const yamlData = JsYaml.loadAll(str);
    const templateYaml: TemplateType = yamlData.find(
      (item: any) => item.kind === 'Template'
    ) as TemplateType;
    const yamlList = yamlData.filter((item: any) => item.kind !== 'Template');
    const dataSource = getTemplateDataSource(templateYaml);
    const result: YamlSourceType = {
      source: {
        ...dataSource,
        ...platformEnvs
      },
      yamlList: yamlList
    };
    return result;
  };

  const generateCorrectYaml = (yamlSource: YamlSourceType, inputsForm = {}) => {
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
      setYamlSource(result);
      const correctYaml = generateCorrectYaml(result);
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

  return (
    <Flex flexDirection={'column'} p={'0px 34px 20px 34px '} h="100vh" maxW={'1440px'} mx="auto">
      <BreadCrumbHeader />
      <Flex
        border={'1px solid #DEE0E2'}
        borderRadius={'8px'}
        overflowY={'hidden'}
        overflowX={'scroll'}
        flex={1}
      >
        {/* left */}
        <Flex flexDirection={'column'} flex={'0 1 500px'} borderRight={'1px solid #EFF0F1'}>
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
          <Box h="100%" w="100%" position={'relative'} overflow={'auto'}>
            <CodeMirror
              extensions={[StreamLanguage.define(yaml)]}
              width="500px"
              height="100%"
              minHeight="1200px"
              onChange={debounce(onYamlChange, 1000)}
            />
          </Box>
        </Flex>
        {/* right */}
        <Flex flex={2} flexDirection={'column'}>
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
          <Flex flexDirection={'column'} h="0" flex={1} overflowY={'scroll'}>
            <Flex pl="42px" pt="26px" borderBottom={'1px solid #EFF0F1'} flexDirection={'column'}>
              <Text fontWeight={'500'} fontSize={'18px'} color={'#24282C'}>
                {t('develop.Configure Form')}
              </Text>
              <Form formSource={yamlSource!} formHook={formHook} />
            </Flex>
            <Flex flex={1} pl="42px" pt="26px" flexDirection={'column'} position={'relative'}>
              <Text fontWeight={'500'} fontSize={'18px'} color={'#24282C'}>
                {t('develop.YAML File')}
              </Text>
              <YamlList yamlList={yamlList} />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

export default Develop;
