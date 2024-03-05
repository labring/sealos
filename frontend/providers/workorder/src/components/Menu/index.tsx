import React from 'react';
import { Menu, MenuList, MenuItem } from '@chakra-ui/react';

interface Props {
  width: number;
  Button: React.ReactNode;
  menuList: {
    isActive?: boolean;
    child: React.ReactNode;
    onClick: () => void;
  }[];
}

const MyMenu = ({ width, Button, menuList }: Props) => {
  const menuItemStyles = {
    borderRadius: 'sm',
    py: 2,
    display: 'flex',
    alignItems: 'center',
    _hover: {
      backgroundColor: 'myWhite.600',
      color: 'hover.blue'
    }
  };

  return (
    <Menu offset={[0, 10]} autoSelect={false}>
      {Button}
      <MenuList
        minW={`${width}px !important`}
        p={'6px'}
        border={'1px solid #fff'}
        boxShadow={'0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25);'}
      >
        {menuList.map((item, i) => (
          <MenuItem
            key={i}
            {...menuItemStyles}
            onClick={item.onClick}
            color={item.isActive ? 'hover.blue' : ''}
          >
            {item.child}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default MyMenu;
