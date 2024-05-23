import React from 'react';
import { Menu, MenuList, MenuItem, MenuItemProps } from '@chakra-ui/react';

interface Props {
  width: number;
  Button: React.ReactNode;
  menuList: {
    isActive?: boolean;
    child: React.ReactNode;
    onClick: () => void;
    menuItemStyle?: MenuItemProps;
    isDisabled?: boolean;
  }[];
}

export const SealosMenu = ({ width, Button, menuList }: Props) => {
  const menuItemStyles = {
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    _hover: {
      backgroundColor: 'rgba(17, 24, 36, 0.05)',
      color: 'brightBlue.600'
    }
  };

  return (
    <Menu offset={[0, 10]} autoSelect={false} isLazy>
      {Button}
      <MenuList
        borderRadius={'md'}
        minW={`${width}px !important`}
        p={'6px'}
        border={'1px solid #fff'}
        boxShadow={'0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25);'}
      >
        {menuList.map((item, i) => (
          <MenuItem
            isDisabled={item?.isDisabled || false}
            key={i}
            onClick={item.onClick}
            color={item.isActive ? 'hover.blue' : 'grayModern.600'}
            py={'6px'}
            px={'4px'}
            {...menuItemStyles}
            {...item.menuItemStyle}
          >
            {item.child}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};
