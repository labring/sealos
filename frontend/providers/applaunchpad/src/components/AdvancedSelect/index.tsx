'use client';

import { useTranslation } from 'next-i18next';
import { ChevronDown } from 'lucide-react';
import React, { useRef, forwardRef, useMemo, useState } from 'react';
import { Button } from '@sealos/shadcn-ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@sealos/shadcn-ui/popover';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { Separator } from '@sealos/shadcn-ui/separator';
import { cn } from '@sealos/shadcn-ui';

export interface ListItem {
  label: string | React.ReactNode;
  value: string;
  checked: boolean;
  isActive?: boolean; // Whether the item is active (e.g., active pod vs historical pod)
}

interface Props {
  width?: string;
  minW?: string;
  height?: string;
  value?: string;
  placeholder?: string;
  list: ListItem[];
  onchange?: (val: string) => void;
  onCheckboxChange?: (list: ListItem[]) => void;
  isInvalid?: boolean;
  checkBoxMode?: boolean;
  leftIcon?: React.ReactNode;
  title?: string;
  className?: string;
}

const AdvancedSelect = (
  {
    placeholder,
    leftIcon,
    value,
    width = 'auto',
    minW = 'auto',
    height = '32px',
    list,
    onchange,
    onCheckboxChange,
    isInvalid,
    checkBoxMode = false,
    title,
    className
  }: Props,
  selectRef: any
) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const displayText = useMemo(() => {
    const selectedCount = checkBoxMode ? list.filter((item) => item.checked).length : 0;
    const activeMenu = list.find((item) => item.value === value);

    if (!checkBoxMode) {
      return activeMenu ? activeMenu.label : placeholder;
    }
    if (selectedCount === 0) {
      return placeholder;
    }
    if (selectedCount === list.length) {
      return t('all');
    }
    return `${selectedCount} ${t('selected')}`;
  }, [checkBoxMode, list, t, value, placeholder]);

  const isPlaceholder = useMemo(() => {
    if (!checkBoxMode) {
      return !list.find((item) => item.value === value);
    }
    return list.filter((item) => item.checked).length === 0;
  }, [checkBoxMode, list, value]);

  // Sort list: active items first, inactive items last
  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => {
      const aActive = a.isActive !== false ? 1 : 0;
      const bActive = b.isActive !== false ? 1 : 0;
      return bActive - aActive;
    });
  }, [list]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={selectRef}
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            'justify-start rounded-lg text-sm font-normal shadow-none hover:bg-zinc-50',
            isInvalid && 'border-red-500',
            className
          )}
          style={{
            width: width,
            minWidth: minW,
            height: height
          }}
        >
          <div className="flex items-center gap-2 w-full">
            {leftIcon && (
              <>
                {leftIcon}
                <Separator orientation="vertical" className="!h-3 bg-zinc-300" />
              </>
            )}
            <span
              className={cn(
                'flex-1 text-left truncate',
                isPlaceholder ? 'text-zinc-500' : 'text-zinc-900'
              )}
            >
              {displayText}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-2 border-[0.5px] border-zinc-200 rounded-xl"
        align="start"
      >
        {title && (
          <div className="px-2 py-0.5">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto scrollbar-default">
          {checkBoxMode && (
            <label className="h-10 flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
              <Checkbox
                checked={list.every((item) => item.checked)}
                onCheckedChange={() => {
                  if (onCheckboxChange) {
                    const newList = list.map((item) => ({
                      ...item,
                      checked: !list.every((item) => item.checked)
                    }));
                    onCheckboxChange(newList);
                  }
                }}
              />
              <span className="text-sm text-zinc-900 flex-1">{t('all')}</span>
            </label>
          )}

          {sortedList.map((item, index) => (
            <div key={item.value + index}>
              {checkBoxMode ? (
                <label className="min-h-10 flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => {
                      if (onCheckboxChange) {
                        const newList = list.map((listItem) =>
                          listItem.value === item.value
                            ? { ...listItem, checked: !listItem.checked }
                            : listItem
                        );
                        onCheckboxChange(newList);
                      }
                    }}
                  />
                  <span
                    className={cn(
                      'text-sm flex-1',
                      item.isActive === false ? 'text-zinc-500' : 'text-zinc-900'
                    )}
                  >
                    {item.label}
                    {item.isActive === false && (
                      <span className="ml-1 text-sm text-zinc-500">({t('terminated')})</span>
                    )}
                  </span>
                </label>
              ) : (
                <div
                  className={cn(
                    'h-10 flex items-center px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-sm',
                    value === item.value && 'text-blue-600'
                  )}
                  onClick={() => {
                    if (onchange && value !== item.value) {
                      onchange(item.value);
                      setIsOpen(false);
                    }
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default forwardRef(AdvancedSelect);
