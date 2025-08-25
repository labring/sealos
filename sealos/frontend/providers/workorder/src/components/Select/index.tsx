import React from 'react';
import { Menu, MenuButton, MenuList, MenuItem, Button, useDisclosure, Box } from '@chakra-ui/react';
import type { ButtonProps } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';

interface Props extends ButtonProps {
  isDisabled?: boolean;
  value?: string;
  placeholder?: string;
  list: {
    label: string;
    id: string;
  }[];
  width?: number | string;
  icon?: React.ReactNode;
  onchange?: (val: string) => void;
}

const MySelect = ({
  placeholder,
  isDisabled = false,
  value,
  width = 'auto',
  list,
  onchange,
  icon = <ChevronDownIcon />,
  ...props
}: Props) => {
  const { t } = useTranslation();

  const menuItemStyles = {
    borderRadius: 'sm',
    py: 2,
    display: 'flex',
    alignItems: 'center',
    transform: 'translate3d(0,0,0)',
    cursor: 'pointer',
    px: 3,
    _hover: {
      backgroundColor: 'myWhite.600'
    }
  };
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Menu
      isOpen={isOpen}
      autoSelect={false}
      onOpen={() => !isDisabled && onOpen()}
      onClose={onClose}
    >
      <MenuButton as={'div'}>
        <Button
          position={'relative'}
          width={width}
          px={3}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'space-between'}
          isDisabled={isDisabled}
          {...(isOpen
            ? {
                boxShadow: '0px 0px 4px #A8DBFF',
                borderColor: 'myBlue.600',
                bg: 'transparent',
                color: 'myGray.800'
              }
            : {
                bg: 'myWhite.300'
              })}
          {...props}
        >
          {t(list?.find((item) => item.id === value)?.label || placeholder || '')}
          <Box position={'absolute'} right={3}>
            {icon}
          </Box>
        </Button>
      </MenuButton>
      {!isDisabled && (
        <MenuList
          minW={`${width} !important`}
          p={'6px'}
          border={'1px solid #fff'}
          boxShadow={
            '0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25);'
          }
          zIndex={99}
          maxH={'300px'}
          overflow={'overlay'}
        >
          {list?.map((item) => (
            <Box
              key={item.id}
              {...menuItemStyles}
              {...(value === item.id
                ? {
                    color: 'myBlue.600'
                  }
                : {})}
              onClick={() => {
                if (onchange && value !== item.id) {
                  onchange(item.id);
                }
                onClose();
              }}
            >
              {t(item.label)}
            </Box>
          ))}
        </MenuList>
      )}
    </Menu>
  );
};

export default React.memo(MySelect);
