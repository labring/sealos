import React, { useRef, forwardRef, useMemo, useState } from 'react';
import {
  Menu,
  Box,
  MenuList,
  MenuItem,
  Button,
  useDisclosure,
  useOutsideClick,
  MenuButton,
  Flex
} from '@chakra-ui/react';
import type { ButtonProps } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import MyIcon, { type IconType } from '../Icon';

interface Props extends ButtonProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  list: {
    icon?: string;
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
    defaultValue,
    width = 'auto',
    list,
    onchange,
    isInvalid,
    height,
    ...props
  }: Props,
  selectRef: any
) => {
  const ref = useRef<HTMLButtonElement>(null);
  const SelectRef = useRef<HTMLDivElement>(null);
  const menuItemStyles = {
    borderRadius: 'sm',
    py: 2,
    display: 'flex',
    alignItems: 'center',
    _hover: {
      backgroundColor: 'myWhite.600'
    }
  };
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [selectedValue, setSelectedValue] = useState(defaultValue || value || '');

  useOutsideClick({
    ref: SelectRef,
    handler: () => {
      onClose();
    }
  });

  const activeMenu = useMemo(
    () => list.find((item) => item.value === (value !== undefined ? value : selectedValue)),
    [list, value, selectedValue]
  );

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
          justifyContent={'center'}
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
                boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                borderColor: 'brightBlue.500',
                bg: '#FFF'
              }
            : {
                bg: '#F7F8FA',
                borderColor: isInvalid ? 'red' : ''
              })}
          {...props}
        >
          <Flex justifyContent={'flex-start'}>{activeMenu ? activeMenu.label : placeholder}</Flex>
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
          border={'1px solid #fff'}
          boxShadow={
            '0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25);'
          }
          zIndex={99}
        >
          {list.map((item) => (
            <MenuItem
              key={item.value}
              {...menuItemStyles}
              {...((value !== undefined ? value : selectedValue) === item.value
                ? {
                    color: 'myBlue.600'
                  }
                : {})}
              onClick={() => {
                setSelectedValue(item.value);
                if (onchange) {
                  onchange(item.value);
                }
              }}
            >
              {!!item.icon && <MyIcon mr={2} name={item.icon as IconType} w={'18px'} />}
              <Box>{item.label}</Box>
            </MenuItem>
          ))}
        </MenuList>
      </Box>
    </Menu>
  );
};

export default React.memo(forwardRef(MySelect));
