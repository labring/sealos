import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const CustomMenu = ({
  width,
  Button,
  menuList,
  isOpen: controlledIsOpen,
  onOpen,
  onClose
}: CustomMenuProps) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;

  const closeMenu = useCallback(() => {
    if (isControlled) {
      onClose?.();
    } else {
      setUncontrolledIsOpen(false);
    }
  }, [isControlled, onClose]);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
      return;
    }

    if (isControlled) {
      onOpen?.();
    } else {
      setUncontrolledIsOpen(true);
    }
  }, [closeMenu, isControlled, isOpen, onOpen]);

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPosition({
      top: rect.bottom + 10,
      left: rect.left - 10
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleItemClick = (item: MenuItemProps) => {
    if (!item.isDisabled) {
      item.onClick();
      closeMenu();
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
      <Box onClick={toggleMenu}>{Button}</Box>

      {isOpen && (
        <Portal>
          <Box
            ref={menuRef}
            position="absolute"
            top={`${position.top}px`}
            left={`${position.left}px`}
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
