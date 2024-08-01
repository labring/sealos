import MyIcon from '@/components/Icon';
import { I18nCommonKey } from '@/types/i18next';
import { Box, Flex, Input, InputGroup, InputLeftElement, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

export interface ConfigItem {
  key: string;
  value: string;
  isEditing: boolean;
  isEdited: boolean;
  originalIndex: number;
}

export interface ConfigTableRef {
  submit: () => Difference[];
  reset: () => void;
}

export interface Difference {
  path: string;
  oldValue: string;
  newValue: string;
}

const ConfigTable = forwardRef<
  ConfigTableRef,
  { initialData: ConfigItem[]; onDifferenceChange: (hasDifferences: boolean) => void }
>(function ConfigTable({ initialData = [], onDifferenceChange }, ref) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const { register, watch, setValue, control, reset } = useForm<{ configs: ConfigItem[] }>({
    defaultValues: {
      configs: initialData.map((item) => ({ ...item, isEditing: false, isEdited: false }))
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'configs'
  });

  const watchFieldArray = watch('configs');

  const controlledFields = fields
    .map((field, index) => {
      return {
        ...field,
        ...watchFieldArray[index],
        originalIndex: index
      };
    })
    .filter((item) => item.key.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleEdit = (index: number) => {
    setValue(`configs.${index}.isEditing`, !watchFieldArray[index].isEditing);
  };

  const handleBlur = (index: number) => {
    const config = watchFieldArray[index];
    setValue(`configs.${index}.isEdited`, config.value !== initialData[index].value);
    setValue(`configs.${index}.isEditing`, false);
  };

  const getChangedConfigs = (): Difference[] => {
    const currentConfigs = watchFieldArray;
    return currentConfigs.reduce((acc, config, index) => {
      if (config.value !== initialData[index].value) {
        acc.push({
          path: config.key,
          oldValue: initialData[index].value,
          newValue: config.value
        });
      }
      return acc;
    }, [] as Difference[]);
  };

  const watchedConfigs = useWatch({
    control,
    name: 'configs'
  });

  useEffect(() => {
    const differences = getChangedConfigs();
    onDifferenceChange(differences.length > 0);
  }, [watchedConfigs]);

  useImperativeHandle(ref, () => ({
    submit: () => {
      const changedConfigs = getChangedConfigs();
      return changedConfigs;
    },
    reset: () => {
      reset({
        configs: initialData.map((item) => ({ ...item, isEditing: false, isEdited: false }))
      });
    }
  }));

  const configColumns: {
    title: I18nCommonKey;
    key: string;
    render: (item: ConfigItem, index: number) => React.ReactNode;
  }[] = [
    {
      title: 'dbconfig.parameter_name',
      key: 'parameter_name',
      render: (item) => (
        <Flex
          pl={'25px'}
          h={'full'}
          fontSize={'base'}
          fontWeight={'bold'}
          alignItems={'center'}
          color={'grayModern.900'}
        >
          {item.key}
        </Flex>
      )
    },
    {
      title: 'dbconfig.parameter_value',
      key: 'parameter_value',
      render: (item) => (
        <Flex alignItems={'center'} h={'full'}>
          {item.isEditing ? (
            <Input
              {...register(`configs.${item.originalIndex}.value`)}
              autoFocus
              onBlur={() => handleBlur(item.originalIndex)}
            />
          ) : (
            <Flex gap={'4px'} alignItems={'center'}>
              <Text maxW={'300px'} color={item.isEdited ? 'red.500' : 'grayModern.600'}>
                {item.value}
              </Text>
              <MyIcon
                onClick={() => toggleEdit(item.originalIndex)}
                cursor={'pointer'}
                name={'edit'}
                w={'16px'}
                h={'16px'}
                color={'grayModern.600'}
              />
            </Flex>
          )}
        </Flex>
      )
    }
  ];

  return (
    <Flex flexDirection={'column'} h={'full'}>
      <Flex px={'25px'} backgroundColor={'grayModern.50'}>
        <Box
          flex={1}
          fontSize={'12px'}
          py={'7px'}
          border={'none'}
          fontWeight={'500'}
          height={'42px'}
          color={'grayModern.600'}
        >
          <Flex alignItems="center">
            <Text mr={2}>{t('dbconfig.parameter_name')}</Text>
            <InputGroup ml={'20px'} width={'184px'}>
              <InputLeftElement ml={'12px'} width={'16px'} height={'28px'}>
                <MyIcon name="search" width={'16px'} height={'16px'} color="#485264" />
              </InputLeftElement>
              <Input
                width={'184px'}
                height={'28px'}
                placeholder={t('dbconfig.search')}
                size="sm"
                value={searchTerm}
                bg={'white'}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Box ml={'4px'} cursor={'pointer'} onClick={() => setSearchTerm('')}>
              <MyIcon name="restart" w={'16px'} h={'16px'} />
            </Box>
          </Flex>
        </Box>
        <Flex
          alignItems={'center'}
          flex={1}
          fontSize={'12px'}
          py={4}
          border={'none'}
          fontWeight={'500'}
          color={'grayModern.600'}
          height={'42px'}
        >
          {t('dbconfig.parameter_value')}
        </Flex>
      </Flex>
      <Box flex={1} height={'0'} overflowY={'auto'}>
        {controlledFields?.map((item, configIndex) => (
          <Flex key={item.id}>
            {configColumns.map((col) => (
              <Box
                flex={1}
                boxSizing={'content-box'}
                fontSize={'12px'}
                py={'11px'}
                h={'32px'}
                key={col.key}
                bg={item.isEdited ? '#FFF6ED' : ''}
              >
                {col.render(item, configIndex)}
              </Box>
            ))}
          </Flex>
        ))}
      </Box>
    </Flex>
  );
});

export default ConfigTable;
