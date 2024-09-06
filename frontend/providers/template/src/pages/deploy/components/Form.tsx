import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import type { QueryType, EnvResponse } from '@/types';
import { FormSourceInput, TemplateSourceType } from '@/types/app';
import {
  Box,
  Flex,
  FormControl,
  Input,
  Text,
  Checkbox,
  NumberInput,
  NumberInputField,
  useTheme
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useCallback, useState, memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { evaluateExpression } from '@/utils/json-yaml';
import { getTemplateValues } from '@/utils/template';
import debounce from 'lodash/debounce';

const Form = ({
  formHook,
  pxVal,
  formSource,
  platformEnvs
}: {
  formHook: UseFormReturn;
  pxVal: number;
  formSource: TemplateSourceType;
  platformEnvs: EnvResponse;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const theme = useTheme();
  const [_, setForceUpdate] = useState(false);

  const isShowContent = useMemo(
    () => !!formSource?.source?.inputs?.length,
    [formSource?.source?.inputs?.length]
  );

  const {
    register,
    formState: { errors },
    getValues,
    setValue
  } = formHook;

  const { defaults, defaultInputs } = useMemo(() => getTemplateValues(formSource), [formSource]);

  const hasDynamicInputs = useMemo(() => {
    return formSource?.source?.inputs?.some((item) => item.if !== undefined);
  }, [formSource?.source?.inputs]);

  const debouncedReset = useCallback(
    debounce(() => {
      setForceUpdate((prev) => !prev);
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
  };
  const filteredInputs = formSource?.source?.inputs?.filter(
    (item) =>
      item.if === undefined || item.if?.length === 0 || !!evaluateExpression(item.if, evalData)
  );

  const boxStyles = {
    border: '1px solid #DFE2EA',
    borderRadius: '8px',
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '42px',
    fontSize: 'xl',
    color: 'myGray.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'grayModern.50',
    borderTopRadius: '8px'
  };

  return (
    <Box flexGrow={1} id={'baseInfo'} {...boxStyles}>
      <Box {...headerStyles} borderBottom={'1px solid #E8EBF0'}>
        <MyIcon name={'formInfo'} mr={'8px'} w={'20px'} color={'grayModern.600'} />
        {t('Configure Project')}
      </Box>
      {isShowContent ? (
        <Box px={'42px'} py={'24px'}>
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
                        defaultValue={getValues(item.key) || item.default}
                        list={item.options?.map((option) => {
                          return {
                            value: option,
                            label: option
                          };
                        })}
                        onchange={(val: any) => {
                          setValue(item.key, val);
                          if (hasDynamicInputs) debouncedReset();
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
                        if (hasDynamicInputs) debouncedReset();
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
                      autoFocus={index === 0}
                      {...register(item?.key, {
                        required: item?.required ? `${item.label} is required` : '',
                        onChange: () => {
                          if (hasDynamicInputs) debouncedReset();
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
                    whiteSpace={'pre-wrap'}
                    wordBreak={'break-word'}
                  >
                    {item?.label}
                    {item?.required && (
                      <Text ml="2px" color={'#E53E3E'}>
                        *
                      </Text>
                    )}
                  </Flex>
                  <Box ml={'17px'} w={'100%'}>
                    {renderInput()}
                  </Box>
                </Flex>
              </FormControl>
            );
          })}
        </Box>
      ) : (
        <Flex
          justifyContent={'center'}
          alignItems="center"
          h={'160px'}
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
