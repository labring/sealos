import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import type { EnvResponse } from '@/types';
import { FormSourceInput, TemplateSourceType } from '@/types/app';
import {
  Box,
  Flex,
  FormControl,
  Input,
  Text,
  Checkbox,
  NumberInput,
  NumberInputField
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useMemo, useCallback, useState, memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { evaluateExpression } from '@/utils/json-yaml';
import { getTemplateValues } from '@/utils/template';
import debounce from 'lodash/debounce';

const Form = ({
  formSource,
  formHook,
  platformEnvs
}: {
  formSource: TemplateSourceType;
  formHook: UseFormReturn;
  platformEnvs: EnvResponse;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const [_, setForceUpdate] = useState(false);

  const isShowContent = useMemo(
    () => !!formSource?.source?.inputs?.length,
    [formSource?.source?.inputs?.length]
  );

  const {
    register,
    formState: { errors },
    setValue,
    getValues,
  } = formHook;

  const { defaults, defaultInputs } = useMemo(() => getTemplateValues(formSource), [formSource]);

  const hasDynamicInputs = useMemo(() => {
    return formSource?.source?.inputs?.some(item => item.if !== undefined);
  }, [formSource?.source?.inputs]);

  const debouncedReset = useCallback(
    debounce(() => {
      setForceUpdate(prev => !prev)
    }, 150),
    []
  );

  const evalData = {
    ...platformEnvs,
    ...formSource?.source,
    inputs: {
      ...defaultInputs,
      ...getValues()
    },
    defaults: defaults
  }
  const filteredInputs = formSource?.source?.inputs?.filter(
    (item) =>
      item.if === undefined ||
      item.if?.length === 0 ||
      !!evaluateExpression(item.if, evalData)
  )

  return (
    <Box flexGrow={1} id={'baseInfo'} minH={'200px'}>
      {isShowContent ? (
        <Box py={'24px'}>
          {filteredInputs.map((item: FormSourceInput, index: number) => {
            const renderInput = () => {
              switch (item.type) {
                case 'choice':
                  if (!item.options) {
                    console.error(`${item.key} options is required`);
                    return null;
                  }
                  return (
                    <Box maxW={'300px'} ml={'20px'} w={'100%'}>
                      <MySelect
                        w={'100%'}
                        bg={'transparent'}
                        borderRadius={'2px'}
                        defaultValue={getValues(item.key) || item.default}
                        list={item.options?.map((option) => {
                          return {
                            value: option,
                            label: option
                          };
                        })}
                        onchange={(val: any) => {
                          setValue(item.key, val);
                          if (hasDynamicInputs) debouncedReset()
                        }}
                      />
                    </Box>
                  );
                case 'boolean':
                  return (
                    <Checkbox
                      ml={'20px'}
                      defaultChecked={item.default === 'true'}
                      onChange={(e) => {
                        setValue(item.key, e.target.checked ? 'true' : 'false');
                        if (hasDynamicInputs) debouncedReset()
                      }}
                    >
                      {item.description && (
                        <Text as="span" ml={2} fontSize="sm" color="gray.500">
                          {item.description}
                        </Text>
                      )}
                    </Checkbox>
                  );
                case 'number':
                case 'string':
                default:
                  return (
                    <Input
                      type={item?.type}
                      maxW={'500px'}
                      ml={'20px'}
                      defaultValue={item?.default}
                      placeholder={item?.description}
                      {...register(item?.key, {
                        required: item?.required,
                        onChange: (e) => {
                          if (hasDynamicInputs) debouncedReset()
                        }
                      })}
                    />
                  );
              }
            };

            return (
              <FormControl key={item?.key} mb={7} isInvalid={!!errors.appName}>
                <Flex alignItems={'center'} align="stretch">
                  <Flex
                    position={'relative'}
                    w="200px"
                    className="template-dynamic-label"
                    color={'#333'}
                    userSelect={'none'}
                  >
                    {item?.label}
                    {item?.required && (
                      <Text ml="2px" color={'#E53E3E'}>
                        *
                      </Text>
                    )}
                  </Flex>
                  {renderInput()}
                </Flex>
              </FormControl>
            );
          })}
        </Box>
      ) : (
        <Flex
          justifyContent={'center'}
          alignItems="center"
          h={'100%'}
          w={'100%'}
          flexDirection="column"
        >
          <Flex
            border={'1px dashed #9CA2A8'}
            borderRadius="50%"
            w={'48px'}
            h={'48px'}
            justifyContent="center"
            alignItems={'center'}
          >
            <MyIcon color={'#7B838B'} name="empty"></MyIcon>
          </Flex>
          <Text mt={'12px'} fontSize={14} color={'#5A646E'}>
            {t('Not need to configure any parameters')}
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default memo(Form);