import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import type { QueryType } from '@/types';
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
import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { evaluateExpression } from '@/utils/json-yaml';
import { getTemplateValues } from '@/utils/template';

const Form = ({
  formHook,
  pxVal,
  formSource
}: {
  formHook: UseFormReturn;
  pxVal: number;
  formSource: TemplateSourceType;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const router = useRouter();
  const { templateName } = router.query as QueryType;
  const theme = useTheme();
  const isShowContent = useMemo(() => !!formSource?.source?.inputs?.length, [formSource?.source?.inputs?.length]);

  const {
    register,
    formState: { errors },
    setValue
  } = formHook;

  const { defaults, defaultInputs } = getTemplateValues(formSource);

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'sm',
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '42px',
    fontSize: '2xl',
    color: 'myGray.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'myWhite.600'
  };

  return (
    <Box flexGrow={1} id={'baseInfo'} {...boxStyles}>
      <Box {...headerStyles}>
        <MyIcon name={'formInfo'} mr={5} w={'24px'} color={'myGray.500'} />
        {t('Configure Project')}
      </Box>
      {isShowContent ? (
        <Box px={'42px'} py={'24px'}>
          {formSource?.source?.inputs
            ?.filter(
              (item) =>
                item.if === undefined ||
                item.if?.length === 0 ||
                evaluateExpression(item.if, {
                  ...formSource?.source,
                  inputs: {
                    ...defaultInputs,
                    ...formHook.getValues()
                  },
                  defaults: defaults
                })
            )
            .map((item: FormSourceInput, index: number) => {
              const commonInputProps = {
                maxW: '500px',
                ml: '20px',
                defaultValue: item?.default,
                placeholder: item?.description,
                autoFocus: index === 0
              };

              const renderInput = () => {
                switch (item.type) {
                  case 'choice':
                    if (!item.options) {
                      console.error(`${item.key} options is required`);
                      return null;
                    }
                    return (
                      <MySelect
                        w={'100%'}
                        bg={'transparent'}
                        borderRadius={'2px'}
                        value={formHook.getValues(item.key) || item.default}
                        list={item.options?.map((option) => ({
                          value: option,
                          label: option
                        }))}
                        onchange={(val: any) => {
                          setValue(item.key, val);
                        }}
                      />
                    );
                  case 'boolean':
                    const input = formHook.getValues(item.key)
                    return (
                      <Checkbox
                        isChecked={input !== undefined ? input === 'true' : item.default === 'true'}
                        onChange={(e) => {
                          setValue(item.key, e.target.checked ? 'true' : 'false');
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
                        {...commonInputProps}
                        {...register(item?.key, {
                          required: item?.required ? `${item.label} is required` : ''
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

export default Form;
