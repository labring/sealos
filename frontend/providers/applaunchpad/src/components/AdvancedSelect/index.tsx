'use client';

import {
  Menu,
  Box,
  MenuList,
  MenuItem,
  Button,
  useDisclosure,
  useOutsideClick,
  MenuButton,
  Flex,
  Checkbox
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ChevronDownIcon } from '@chakra-ui/icons';
import React, { useRef, forwardRef, useMemo } from 'react';
import type { BoxProps, ButtonProps } from '@chakra-ui/react';

export interface ListItem {
  label: string | React.ReactNode;
  value: string;
  checked: boolean;
}

interface Props extends ButtonProps {
  width?: string;
  height?: string;
  value?: string;
  placeholder?: string;
  list: ListItem[];
  onchange?: (val: string) => void;
  onCheckboxChange?: (list: ListItem[]) => void;
  isInvalid?: boolean;
  boxStyle?: BoxProps;
  checkBoxMode?: boolean;
}

const AdvancedSelect = (
  {
    placeholder,
    leftIcon,
    value,
    width = 'auto',
    height = '30px',
    list,
    onchange,
    onCheckboxChange,
    isInvalid,
    boxStyle,
    checkBoxMode = false,
    ...props
  }: Props,
  selectRef: any
) => {
  const { t } = useTranslation();

  const ref = useRef<HTMLButtonElement>(null);
  const SelectRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useOutsideClick({
    ref: SelectRef,
    handler: () => {
      onClose();
    }
  });

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
    return `${t('selected')} ${selectedCount}`;
  }, [checkBoxMode, list, t, value, placeholder]);

  return (
    <Menu
      autoSelect={false}
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      closeOnSelect={false}
    >
      <Box ref={SelectRef} position={'relative'} {...boxStyle}>
        <MenuButton
          as={Button}
          leftIcon={leftIcon}
          rightIcon={<ChevronDownIcon />}
          width={width}
          height={height}
          ref={ref}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          border={'1px solid #E8EBF0'}
          borderRadius={'md'}
          fontSize={'12px'}
          fontWeight={'400'}
          color={'grayModern.900'}
          variant={'outline'}
          _hover={{
            borderColor: 'brightBlue.300',
            bg: 'grayModern.50'
          }}
          _active={{
            transform: ''
          }}
          boxShadow={'none'}
          {...(isOpen
            ? {
                // boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                borderColor: 'brightBlue.500',
                bg: '#FFF'
              }
            : {
                bg: '#F7F8FA',
                borderColor: isInvalid ? 'red' : ''
              })}
          onClick={() => {
            isOpen ? onClose() : onOpen();
          }}
          {...props}
        >
          <Flex
            justifyContent={'flex-start'}
            width="100%"
            alignItems={'center'}
            {...(placeholder ? { color: 'grayModern.500' } : {})}
          >
            {displayText}
          </Flex>
        </MenuButton>

        <MenuList
          minW={(() => {
            const w = ref.current?.clientWidth;
            if (w) {
              return `${w}px !important`;
            }
            return Array.isArray(width)
              ? width.map((item) => `${item} !important`)
              : `${width} !important`;
          })()}
          p={'6px'}
          borderRadius={'base'}
          border={'1px solid #E8EBF0'}
          boxShadow={
            '0px 4px 10px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)'
          }
          zIndex={99}
          overflow={'overlay'}
          maxH={'300px'}
        >
          {checkBoxMode && (
            <MenuItem
              borderRadius={'4px'}
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: 'brightBlue.600'
              }}
              p={'6px'}
              w={'100%'}
            >
              <Checkbox
                w={'100%'}
                isChecked={list.every((item) => item.checked)}
                onChange={() => {
                  if (onCheckboxChange) {
                    const newList = list.map((item) => ({
                      ...item,
                      checked: !list.every((item) => item.checked)
                    }));
                    onCheckboxChange(newList);
                  }
                }}
                sx={{
                  'span.chakra-checkbox__control[data-checked]': {
                    background: '#f0f4ff',
                    border: '1px solid #219bf4 ',
                    boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                    color: '#219bf4',
                    borderRadius: '4px'
                  },
                  'span.chakra-checkbox__control': {
                    background: 'white',
                    border: '1px solid #E8EBF0',
                    borderRadius: '4px'
                  }
                }}
              >
                {t('all')}
              </Checkbox>
            </MenuItem>
          )}

          {list.map((item, index) => (
            <MenuItem
              key={item.value + index}
              {...(!checkBoxMode && value === item.value
                ? {
                    color: 'brightBlue.600'
                  }
                : {})}
              borderRadius={'4px'}
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: 'brightBlue.600'
              }}
              p={'6px'}
              onClick={() => {
                if (onchange && value !== item.value) {
                  onchange(item.value);
                }
              }}
            >
              {checkBoxMode ? (
                <Checkbox
                  isChecked={item.checked}
                  key={item.value}
                  onChange={() => {
                    if (onCheckboxChange) {
                      const newList = list.map((listItem) =>
                        listItem.value === item.value
                          ? { ...listItem, checked: !listItem.checked }
                          : listItem
                      );
                      onCheckboxChange(newList);
                    }
                  }}
                  sx={{
                    'span.chakra-checkbox__control[data-checked]': {
                      background: '#f0f4ff ',
                      border: '1px solid #219bf4 ',
                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                      color: '#219bf4',
                      borderRadius: '4px'
                    },
                    'span.chakra-checkbox__control': {
                      background: 'white',
                      border: '1px solid #E8EBF0',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {item.label}
                </Checkbox>
              ) : (
                <Box>{item.label}</Box>
              )}
            </MenuItem>
          ))}
        </MenuList>
      </Box>
    </Menu>
  );
};

export default forwardRef(AdvancedSelect);
