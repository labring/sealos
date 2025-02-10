import { BaseTable } from '@/components/BaseTable/index';
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Collapse,
  Divider,
  Flex,
  Text
} from '@chakra-ui/react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import { get } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import MyIcon from '@/components/Icon';
import { formatTime } from '@/utils/tools';
import { LogsFormData } from '@/pages/app/detail/logs';
import { UseFormReturn } from 'react-hook-form';
import { useLogStore } from '@/store/logStore';

interface FieldItem {
  value: string;
  label: string;
  checked: boolean;
  accessorKey: string;
}

interface LogData {
  stream: string;
  [key: string]: any;
}

export const LogTable = ({
  data,
  isLoading,
  formHook
}: {
  data: any[];
  isLoading: boolean;
  formHook: UseFormReturn<LogsFormData>;
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [onOpenField, setOnOpenField] = useState(false);
  const [hiddenFieldCount, setHiddenFieldCount] = useState(0);
  const [visibleFieldCount, setVisibleFieldCount] = useState(0);
  const isJsonMode = formHook.watch('isJsonMode');
  const { exportLogs } = useLogStore();

  const generateFieldList = useCallback((data: any[], prevFieldList: FieldItem[] = []) => {
    if (!data.length) return [];

    const uniqueKeys = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        uniqueKeys.add(key);
      });
    });

    const prevFieldStates = prevFieldList.reduce((acc, field) => {
      acc[field.value] = field.checked;
      return acc;
    }, {} as Record<string, boolean>);

    return Array.from(uniqueKeys).map((key) => ({
      value: key,
      label: key,
      checked: key in prevFieldStates ? prevFieldStates[key] : true,
      accessorKey: key
    }));
  }, []);

  const [fieldList, setFieldList] = useState<FieldItem[]>([]);

  useEffect(() => {
    setFieldList((prevFieldList) => generateFieldList(data, prevFieldList));
    const excludeFields = ['_time', '_msg', 'container', 'pod', 'stream'];
    formHook.setValue(
      'filterKeys',
      generateFieldList(data)
        .filter((field) => !excludeFields.includes(field.value))
        .map((field) => ({ value: field.value, label: field.label }))
    );
  }, [data, generateFieldList, formHook]);

  useEffect(() => {
    const visibleCount = fieldList.filter((field) => field.checked).length;
    setVisibleFieldCount(visibleCount);
    setHiddenFieldCount(fieldList.length - visibleCount);
  }, [fieldList]);

  const columns = useMemo<Array<ColumnDef<any>>>(() => {
    return fieldList
      .filter((field) => field.checked)
      .map((field) => ({
        accessorKey: field.accessorKey,
        header: () => {
          if (field.label === '_time' || field.label === '_msg') {
            return field.label.substring(1);
          }
          return field.label;
        },
        cell: ({ row }) => {
          let value = get(row.original, field.accessorKey, '');

          if (field.accessorKey === '_time') {
            value = formatTime(value, 'YYYY-MM-DD HH:mm:ss');
          }

          return (
            <Text
              color={row.original.stream === 'stderr' ? '#B42318' : 'grayModern.600'}
              fontSize={'12px'}
              fontWeight={400}
              lineHeight={'16px'}
              {...(field.accessorKey === '_msg' && {
                maxW: '600px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              })}
            >
              {value?.toString() || ''}
            </Text>
          );
        },
        meta: {
          isError: (row: any) => row.stream === 'stderr'
        }
      }));
  }, [fieldList]);

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <Flex flexDir={'column'} w={'100%'} h={'100%'}>
      <Flex alignItems={'center'} gap={4} justifyContent={'space-between'}>
        <Flex alignItems={'center'} gap={4}>
          <Text
            bg={'transparent'}
            border={'none'}
            boxShadow={'none'}
            color={'grayModern.900'}
            fontWeight={500}
            fontSize={'14px'}
            lineHeight={'20px'}
          >
            {t('Log')}
          </Text>
          {isJsonMode && (
            <Flex
              alignItems={'center'}
              bg={'grayModern.50'}
              borderRadius={'8px'}
              {...(onOpenField && {
                borderRadius: '8px 8px 0 0'
              })}
              px={4}
            >
              <Button
                p={0}
                onClick={() => setOnOpenField(!onOpenField)}
                bg={'transparent'}
                border={'none'}
                boxShadow={'none'}
                color={'grayModern.900'}
                fontWeight={400}
                fontSize={'12px'}
                lineHeight={'16px'}
                mr={4}
                leftIcon={
                  <MyIcon
                    name="arrowRight"
                    color={'grayModern.500'}
                    w={'16px'}
                    transform={onOpenField ? 'rotate(90deg)' : 'rotate(0)'}
                    transition="transform 0.2s ease"
                  />
                }
                _hover={{
                  color: 'brightBlue.600',
                  '& svg': {
                    color: 'brightBlue.600'
                  }
                }}
              >
                {t('field_settings')}
              </Button>
              <Flex alignItems={'center'} gap={2} mr={2}>
                <Text fontSize={'12px'} lineHeight={'16px'} color={'grayModern.500'}>
                  {t('visible')}:
                </Text>
                <Text fontSize={'12px'} lineHeight={'16px'} color={'grayModern.500'}>
                  {visibleFieldCount} {lang === 'zh' ? t('piece') : ''}
                </Text>
              </Flex>
              <Box h={'12px'} mr={2}>
                <Divider orientation="vertical" color={'grayModern.300'} borderWidth={'1px'} />
              </Box>
              <Flex alignItems={'center'} gap={2}>
                <Text fontSize={'12px'} lineHeight={'16px'} color={'grayModern.500'}>
                  {t('hidden')}:
                </Text>
                <Text fontSize={'12px'} lineHeight={'16px'} color={'grayModern.500'}>
                  {hiddenFieldCount} {lang === 'zh' ? t('piece') : ''}
                </Text>
              </Flex>
            </Flex>
          )}
        </Flex>
        <Button
          minW={'75px'}
          fontSize={'12px'}
          variant={'outline'}
          h={'28px'}
          leftIcon={<MyIcon name="export" />}
          onClick={() => exportLogs()}
        >
          {t('export_log')}
        </Button>
      </Flex>

      {isJsonMode && (
        <Collapse in={onOpenField} animateOpacity style={{ flexShrink: 0 }}>
          <Flex
            p={4}
            position={'relative'}
            h={'100%'}
            w={'100%'}
            bg={'grayModern.50'}
            borderRadius={'8px'}
            gap={'12px'}
            flexWrap={'wrap'}
          >
            <CheckboxGroup colorScheme="brightBlue">
              {fieldList.map((item) => (
                <Checkbox
                  isChecked={item.checked}
                  key={item.value}
                  onChange={() =>
                    setFieldList(
                      fieldList.map((field) =>
                        field.value === item.value ? { ...field, checked: !field.checked } : field
                      )
                    )
                  }
                  sx={{
                    'span.chakra-checkbox__control[data-checked]': {
                      background: '#f0f4ff ',
                      border: '1px solid #219bf4 ',
                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                      color: '#219bf4',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {item.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </Flex>
        </Collapse>
      )}

      {data.length > 0 ? (
        <BaseTable
          height={'100%'}
          mt={'12px'}
          table={table}
          isLoading={isLoading}
          overflowY={'auto'}
          isHeaderFixed={true}
          tdStyle={{
            p: '10px 24px',
            borderBottom: 'none'
          }}
        />
      ) : (
        <Flex
          justifyContent={'center'}
          alignItems={'center'}
          flexDirection={'column'}
          height={'240px'}
        >
          <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
          <Box fontSize={'14px'} fontWeight={500} color={'grayModern.500'} pt={'8px'}>
            {t('no_data_available')}
          </Box>
        </Flex>
      )}
    </Flex>
  );
};
