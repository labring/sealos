import { BaseTable } from '@/components/BaseTable/index';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import { get } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ScrollText, Filter as FilterIcon } from 'lucide-react';

import { formatTime } from '@/utils/tools';
import { LogsFormData } from '@/pages/app/detail/logs';
import { UseFormReturn } from 'react-hook-form';
import { useLogStore } from '@/store/logStore';
import { Button } from '@sealos/shadcn-ui/button';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { cn } from '@sealos/shadcn-ui';
import { Separator } from '@sealos/shadcn-ui/separator';

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
  const isOnlyStderr = formHook.watch('isOnlyStderr');
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
          return t('log_table.' + field.label) || field.label;
        },
        cell: ({ row }) => {
          let value = get(row.original, field.accessorKey, '');

          if (field.accessorKey === '_time') {
            value = formatTime(value, 'YYYY-MM-DD HH:mm:ss');
          }

          return (
            <span
              className={cn(
                'text-xs font-normal leading-4',
                isOnlyStderr
                  ? row.original.stream === 'stderr'
                    ? 'text-red-600'
                    : 'text-gray-600'
                  : 'text-gray-600',
                field.accessorKey === '_msg' && 'max-w-[600px] whitespace-pre-wrap break-words'
              )}
            >
              {value?.toString() || ''}
            </span>
          );
        },
        meta: {
          isError: (row: any) => row.stream === 'stderr'
        }
      }));
  }, [fieldList, isOnlyStderr, t]);

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <div className="flex flex-col w-full h-full">
      <div
        className={cn(
          'px-5 pt-4 pb-3 min-h-16 flex items-center flex-wrap justify-between border-b border-zinc-200',
          onOpenField ? 'pb-4' : ''
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-900 font-medium text-base">{t('Log')}</span>
          {isJsonMode && (
            <div className="h-10 overflow-visible">
              <Button
                variant="outline"
                className={cn(
                  'flex items-center gap-2 h-fit py-[9px] px-4 rounded-lg shadow-none border-dashed border-neutral-300',
                  onOpenField
                    ? 'bg-zinc-50 pb-[18px] border-b-0 rounded-b-none'
                    : 'bg-white hover:bg-zinc-50'
                )}
                onClick={() => setOnOpenField(!onOpenField)}
              >
                <FilterIcon className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-zinc-900 mr-2">
                  {t('field_settings')}
                </span>
                <div className="flex font-normal items-center gap-0.5">
                  <span className="text-sm text-zinc-500">{t('visible')}:</span>
                  <span className="text-sm text-zinc-500">{visibleFieldCount}</span>
                </div>
                <Separator orientation="vertical" className="!h-3 bg-zinc-300" />
                <div className="flex font-normal items-center gap-0.5">
                  <span className="text-sm text-zinc-500">{t('hidden')}:</span>
                  <span className="text-sm text-zinc-500">{hiddenFieldCount}</span>
                </div>
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="min-w-[100px] h-10 text-sm font-medium rounded-lg gap-2 !px-4 hover:bg-zinc-50 stroke-[1.33px]"
          onClick={() => exportLogs()}
        >
          <Download className="w-4 h-4 text-neutral-500" />
          {t('export_log')}
        </Button>

        {isJsonMode && (
          <div
            className={cn(
              'mt-2 p-4 w-full bg-zinc-50 border border-zinc-200 border-dashed rounded-lg gap-6 flex-wrap transition-all duration-200 ease-in-out overflow-hidden shrink-0',
              onOpenField ? 'flex max-h-96' : 'hidden max-h-0'
            )}
          >
            {fieldList.map((item) => (
              <div key={item.value} className="flex items-center space-x-2 h-fit">
                <Checkbox
                  id={item.value}
                  checked={item.checked}
                  onCheckedChange={() =>
                    setFieldList(
                      fieldList.map((field) =>
                        field.value === item.value ? { ...field, checked: !field.checked } : field
                      )
                    )
                  }
                />
                <label
                  htmlFor={item.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {item.label}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div className="w-full h-full flex-1 min-h-0 py-6 px-6">
          <BaseTable
            className=""
            table={table}
            isLoading={isLoading}
            isHeaderFixed={true}
            rowClassName={(row) =>
              row.original?.stream === 'stderr' ? 'bg-red-50 hover:bg-red-50' : ''
            }
          />
        </div>
      ) : (
        <div className="flex items-center justify-center flex-col h-full flex-1 gap-3">
          <div className="h-10 w-10 flex items-center justify-center border border-dashed border-zinc-200 rounded-xl">
            <ScrollText className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
          </div>
          <div className="text-zinc-900 text-sm font-semibold">{t('no_data_available')}</div>
        </div>
      )}
    </div>
  );
};
