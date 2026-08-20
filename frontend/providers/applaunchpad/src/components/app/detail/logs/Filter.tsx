import { Search, X, Plus, Filter as FilterIcon, Inbox, Trash2 } from 'lucide-react';
import { JsonFilterItem, LogsFormData } from '@/pages/app/detail/logs';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Switch } from '@sealos/shadcn-ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { cn } from '@sealos/shadcn-ui';

export const Filter = ({
  formHook,
  refetchData
}: {
  formHook: UseFormReturn<LogsFormData>;
  refetchData: () => void;
}) => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('normal_filter');
  const [inputKeyword, setInputKeyword] = useState(formHook.watch('keyword'));

  const isJsonMode = formHook.watch('isJsonMode');
  const isOnlyStderr = formHook.watch('isOnlyStderr');
  const filterKeys = formHook.watch('filterKeys');

  const { fields, append, remove } = useFieldArray({
    control: formHook.control,
    name: 'jsonFilters'
  });

  return (
    <div className="py-3 px-5 w-full flex flex-col">
      {/* operator button */}
      <div className="flex gap-5">
        <div className="h-10 overflow-visible">
          <Button
            variant="outline"
            className={cn(
              'flex items-center gap-2 h-fit py-[9px] px-4 rounded-lg shadow-none border-dashed border-neutral-300',
              isJsonMode
                ? 'bg-zinc-50 pb-[18px] border-b-0 rounded-b-none'
                : 'bg-white hover:bg-zinc-50'
            )}
            onClick={() => {
              formHook.setValue('isJsonMode', !isJsonMode);
              formHook.setValue('jsonFilters', []);
            }}
          >
            <FilterIcon className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-zinc-900">{t('json_mode')}</span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-900">{t('highlight_stderr')}</span>
          <Switch
            checked={isOnlyStderr}
            onCheckedChange={(checked) => formHook.setValue('isOnlyStderr', checked)}
          />
        </div>

        <div className="flex items-center justify-start gap-5 flex-1">
          <div className="flex-1 max-w-[350px]">
            <Input
              placeholder={t('keyword')}
              value={inputKeyword}
              onChange={(e) => setInputKeyword(e.target.value)}
              className="h-10 rounded-lg shadow-none text-sm font-normal text-zinc-900 bg-zinc-100 border-0"
            />
          </div>

          <Button
            onClick={() => {
              formHook.setValue('keyword', inputKeyword);
              refetchData();
            }}
            className="h-10 !px-4 rounded-lg shadow-none text-sm font-normal"
          >
            <Search className="w-4 h-4" />
            <span className="ml-0.5">{t('search')}</span>
          </Button>
        </div>
      </div>

      {/* json mode */}
      {isJsonMode && (
        <div className="mt-2 w-full bg-zinc-50 min-h-[75px] p-4 gap-x-6 gap-y-2 flex flex-wrap rounded-b-lg rounded-tr-lg border border-neutral-300 border-dashed">
          {fields.map((field, index) => (
            <div key={field.id} className="w-fit flex gap-2">
              {/* Field Name Select */}
              <Select
                value={formHook.watch(`jsonFilters.${index}.key`)}
                onValueChange={(val: string) => formHook.setValue(`jsonFilters.${index}.key`, val)}
              >
                <SelectTrigger className="h-8 min-w-[160px] rounded-lg text-sm font-normal text-zinc-900 shadow-none hover:bg-zinc-50 bg-white">
                  <SelectValue placeholder={t('field_name')} />
                </SelectTrigger>
                <SelectContent className="border-[0.5px] border-zinc-200 rounded-xl p-1">
                  {formHook.watch('filterKeys').map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="h-8 rounded-lg hover:bg-zinc-50 cursor-pointer"
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Mode Select */}
              <Select
                value={formHook.watch(`jsonFilters.${index}.mode`)}
                onValueChange={(val: string) =>
                  formHook.setValue(`jsonFilters.${index}.mode`, val as JsonFilterItem['mode'])
                }
              >
                <SelectTrigger className="h-8 w-[80px] rounded-lg text-sm font-normal text-zinc-900 shadow-none hover:bg-zinc-50 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[0.5px] border-zinc-200 rounded-xl p-1">
                  <SelectItem value="=" className="h-8 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    {t('equal')}
                  </SelectItem>
                  <SelectItem value="!=" className="h-8 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    {t('not_equal')}
                  </SelectItem>
                  <SelectItem value="~" className="h-8 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    {t('contains')}
                  </SelectItem>
                  <SelectItem value="!~" className="h-8 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    {t('not_contains')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Value Input */}
              <Input
                className="h-10 rounded-lg min-w-[300px] bg-white shadow-none text-sm font-normal text-zinc-900"
                placeholder={t('value')}
                value={formHook.watch(`jsonFilters.${index}.value`)}
                onChange={(e) => formHook.setValue(`jsonFilters.${index}.value`, e.target.value)}
              />

              {/* Remove Button */}
              <Button
                variant="outline"
                className="h-10 w-10 rounded-lg shadow-none hover:bg-zinc-50"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-4 h-4 text-neutral-500" />
              </Button>
            </div>
          ))}

          {filterKeys.length > 0 || fields.length > 0 ? (
            <AppendJSONFormItemButton
              onClick={() =>
                append({
                  key: '',
                  value: '',
                  mode: '='
                })
              }
            />
          ) : (
            <div className="flex-1 flex justify-center items-center">
              <div className="flex items-center gap-3">
                <Inbox className="w-6 h-6 text-zinc-400 stroke-[1.5px]" />
                <span className="text-sm font-normal text-zinc-900">{t('no_data_available')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AppendJSONFormItemButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <Button
      variant="outline"
      className="h-10 !px-4 rounded-lg shadow-none hover:bg-zinc-50"
      onClick={onClick}
    >
      <Plus className="w-4 h-4 text-neutral-500" />
      <span className="text-sm font-medium text-zinc-900">{t('add_conditions')}</span>
    </Button>
  );
};
