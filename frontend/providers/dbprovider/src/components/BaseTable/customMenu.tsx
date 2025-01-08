import React, { useState, useRef, useEffect } from 'react';
import { Box, Portal } from '@chakra-ui/react';

interface MenuItemProps {
  isActive?: boolean;
  child: React.ReactNode;
  onClick: () => void;
  menuItemStyle?: any;
  isDisabled?: boolean;
}

interface CustomMenuProps {
  width: number;
  Button: React.ReactNode;
  menuList: MenuItemProps[];
}

export const CustomMenu = ({ width, Button, menuList }: CustomMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: MenuItemProps) => {
    if (!item.isDisabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const defaultMenuItemStyles = {
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    py: '6px',
    px: '4px',
    _hover: {
      backgroundColor: 'rgba(17, 24, 36, 0.05)',
      color: 'brightBlue.600'
    }
  };

  return (
    <Box position="relative" ref={buttonRef}>
      <Box onClick={() => setIsOpen(!isOpen)}>{Button}</Box>

      {isOpen && (
        <Portal>
          <Box
            ref={menuRef}
            position="absolute"
            top={`${(buttonRef.current?.getBoundingClientRect().bottom || 0) + 10}px`}
            left={`${(buttonRef.current?.getBoundingClientRect().left || 0) - 10}px`}
            maxH="300px"
            overflowY="auto"
            borderRadius="md"
            minW={`${width}px`}
            p="6px"
            border="1px solid #fff"
            boxShadow="0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25)"
            bg="white"
            zIndex={1000}
          >
            {menuList.map((item, i) => (
              <Box
                key={i}
                onClick={() => handleItemClick(item)}
                color={item.isActive ? 'hover.blue' : 'grayModern.600'}
                opacity={item.isDisabled ? 0.5 : 1}
                {...defaultMenuItemStyles}
                {...item.menuItemStyle}
              >
                {item.child}
              </Box>
            ))}
          </Box>
        </Portal>
      )}
    </Box>
  );
};
