import { FormSchema, TabId } from '@/consts';
import { json2Bucket } from '@/utils/json2Yaml';
import { Flex, Box, Stack, IconButton, Text, useTab } from '@chakra-ui/react';
import { EditTabs, YamlCode } from '@sealos/ui';
import { useState, useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import CopyIcon from '../Icons/CopyIcon';
import InfoIcon from '../Icons/InfoIcon';
import ConfigFormContainer from './ConfigFormContainer';
import EditListItem from './EditListItem';
import BasicConfigHookForm from './BasicConfigHookForm';
import { useTranslation } from 'next-i18next';
import { useCopyData } from '@/utils/tools';
const ConfigMain = () => {
  const [activeId, setActiveId] = useState(TabId.Form);
  const { copyData } = useCopyData();
  const [selectedYamlIndex, setSelectedYamlIndex] = useState(0);
  const { getValues } = useFormContext<FormSchema>();
  const { t } = useTranslation();
  const [yamlList, setYamlList] = useState<{ filename: string; value: string }[]>([]);
  useEffect(() => {
    activeId === TabId.Yaml && setYamlList(json2Bucket(getValues()));
  }, [activeId]);
  const editList = useMemo(() => {
    if (activeId === TabId.Yaml)
      // formVal will not be modify,
      return yamlList.map((x) => ({ key: x.filename, title: x.filename }));
    else if (activeId === TabId.Form) return [{ key: 'config', title: 'config' }];
    else return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  return (
    <Flex w="100%" h="100%" justifyContent={'center'} px="32px" gap="36px">
      <Box w="220px">
        <EditTabs
          list={[
            { id: TabId.Form, label: t('configForm') },
            { id: TabId.Yaml, label: t('yamlFile') }
          ]}
          activeId={activeId}
          onChange={function (id): void {
            setActiveId(id);
          }}
        />
        {
          // yaml output
          activeId === TabId.Yaml ? (
            <Box bgColor={'white'} mt={'6px'}>
              {editList.map((x, idx) => (
                <EditListItem key={x.key} isSelected onClick={() => setSelectedYamlIndex(idx)}>
                  <Text>{x.title}</Text>
                </EditListItem>
              ))}
            </Box>
          ) : // form config
          activeId === TabId.Form ? (
            <Box bgColor={'white'} mt={'6px'}>
              <EditListItem isSelected={true}>
                <InfoIcon w="20px" h="20px" />
                <Text>{t('config')}</Text>
              </EditListItem>
            </Box>
          ) : (
            <></>
          )
        }
      </Box>
      <Stack h="100%">
        {activeId === TabId.Yaml ? (
          !!yamlList[selectedYamlIndex] && (
            <ConfigFormContainer
              header={
                <>
                  <Box flex={1} fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
                    {yamlList[selectedYamlIndex].filename}
                  </Box>
                  <IconButton
                    variant={'white-bg-icon'}
                    icon={<CopyIcon name="copy" w={'20px'} h={'20px'} />}
                    p="4px"
                    color={'grayModern.600'}
                    onClick={() => {
                      copyData(yamlList[selectedYamlIndex].value);
                    }}
                    aria-label={'copy yaml'}
                  ></IconButton>
                </>
              }
              main={<YamlCode markdown={{ children: yamlList[selectedYamlIndex].value }} />}
            />
          )
        ) : (
          <ConfigFormContainer
            header={
              <Flex
                flex={1}
                fontSize={'xl'}
                color={'grayModern.900'}
                gap="12px"
                fontWeight={'bold'}
                align={'center'}
              >
                <InfoIcon w="24px" h="24px" color="grayModern.600" />
                <Text>{t('configForm')}</Text>
              </Flex>
            }
            main={<BasicConfigHookForm />}
          />
        )}
      </Stack>
    </Flex>
  );
};
export default ConfigMain;
