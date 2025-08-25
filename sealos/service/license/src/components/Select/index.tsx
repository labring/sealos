import React, { useRef, forwardRef, useMemo } from 'react';
import {
  Menu,
  Box,
  MenuList,
  MenuItem,
  Button,
  useDisclosure,
  useOutsideClick,
  MenuButton
} from '@chakra-ui/react';
import type { ButtonProps } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

interface Props extends ButtonProps {
  width?: string;
  height?: string;
  value?: string;
  placeholder?: string;
  list: {
    label: string | React.ReactNode;
    value: string;
  }[];
  onchange?: (val: string) => void;
  isInvalid?: boolean;
}

const MySelect = (
  {
    placeholder,
    value,
    width = 'auto',
    height = '30px',
    list,
    onchange,
    isInvalid,
    ...props
  }: Props,
  selectRef: any
) => {
  const ref = useRef<HTMLButtonElement>(null);
  const SelectRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useOutsideClick({
    ref: SelectRef,
    handler: () => {
      onClose();
    }
  });

  const activeMenu = useMemo(() => list.find((item) => item.value === value), [list, value]);

  return (
    <Menu autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <Box
        ref={SelectRef}
        position={'relative'}
        onClick={() => {
          isOpen ? onClose() : onOpen();
        }}
      >
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          width={width}
          height={height}
          ref={ref}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'space-between'}
          border={'1px solid #E8EBF0'}
          borderRadius={'md'}
          fontSize={'12px'}
          fontWeight={'400'}
          variant={'outline'}
          _hover={{
            borderColor: '#94B5FF',
            bg: 'rgba(17, 24, 36, 0.05)'
          }}
          _active={{
            transform: ''
          }}
          {...(isOpen
            ? {
                boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                borderColor: '#487FFF',
                bg: '#FFF'
              }
            : {
                bg: '#F7F8FA',
                borderColor: isInvalid ? 'red' : ''
              })}
          {...props}
        >
          {activeMenu ? (
            <>
              <Box>{activeMenu.label}</Box>
            </>
          ) : (
            <>
              <Box>{placeholder}</Box>
            </>
          )}
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
          {list.map((item) => (
            <MenuItem
              key={item.value}
              {...(value === item.value
                ? {
                    color: 'brightBlue.600'
                  }
                : {})}
              borderRadius={'4px'}
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: '#3370FF'
              }}
              onClick={() => {
                if (onchange && value !== item.value) {
                  onchange(item.value);
                }
              }}
            >
              <Box>{item.label}</Box>
            </MenuItem>
          ))}
        </MenuList>
      </Box>
    </Menu>
  );
};

export default forwardRef(MySelect);
