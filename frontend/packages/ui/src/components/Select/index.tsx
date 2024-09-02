import { ChevronDownIcon } from '@chakra-ui/icons';
import type { ButtonProps } from '@chakra-ui/react';
import { Box, Button, Menu, MenuButton, MenuItem, MenuList, useDisclosure } from '@chakra-ui/react';
import React, { forwardRef, useMemo, useRef } from 'react';

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
}

const MySelect = (
  { placeholder, value, width = 'auto', height = '30px', list, onchange, ...props }: Props,
  selectRef: any
) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const activeMenu = useMemo(() => list.find((item) => item.value === value), [list, value]);

  return (
    <Menu autoSelect={false}>
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
          borderColor: 'brightBlue.300',
          bg: 'grayModern.50'
        }}
        _active={{
          transform: ''
        }}
        {...(isOpen
          ? {
              borderColor: 'brightBlue.600',
              bg: '#FFF'
            }
          : {
              bg: '#F7F8FA'
            })}
        textAlign={'left'}
        {...props}
      >
        {activeMenu ? (
          <>
            <Box noOfLines={1}>{activeMenu.label}</Box>
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
        // transform={'translateY(40px) !important'}
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
              color: 'brightBlue.600'
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
    </Menu>
  );
};

export default React.memo(forwardRef(MySelect));
