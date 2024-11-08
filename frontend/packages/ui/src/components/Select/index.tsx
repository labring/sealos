import { ChevronDownIcon } from '@chakra-ui/icons';
import type { ButtonProps } from '@chakra-ui/react';
import { Box, Button, Portal, forwardRef, useOutsideClick } from '@chakra-ui/react';
import React, { useMemo, useRef, useState } from 'react';

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

const MySelect = forwardRef<Props, 'button'>(
  (
    { placeholder, value, width = 'auto', height = '30px', list, onchange, ...props },
    selectRef
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useOutsideClick({
      ref: ref,
      handler: () => setIsOpen(false)
    });

    const activeMenu = useMemo(() => list.find((item) => item.value === value), [list, value]);

    return (
      <Box ref={ref} position="relative" width={width}>
        <Button
          ref={buttonRef}
          rightIcon={
            <ChevronDownIcon
              transition="transform 0.2s"
              transform={isOpen ? 'rotate(180deg)' : undefined}
            />
          }
          width="100%"
          height={height}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          border="1px solid"
          borderColor={isOpen ? 'brightBlue.600' : '#E8EBF0'}
          borderRadius="md"
          fontSize="12px"
          fontWeight="400"
          variant="outline"
          _hover={{
            borderColor: 'brightBlue.300',
            bg: 'grayModern.50'
          }}
          _active={{
            transform: 'none'
          }}
          bg={isOpen ? '#FFF' : '#F7F8FA'}
          textAlign="left"
          transition="all 0.2s"
          onClick={() => setIsOpen(!isOpen)}
          {...props}
        >
          {activeMenu ? (
            <Box noOfLines={1}>{activeMenu.label}</Box>
          ) : (
            <Box color="gray.500">{placeholder}</Box>
          )}
        </Button>

        {isOpen && (
          <Portal>
            <Box
              position="fixed"
              zIndex={2000}
              width={buttonRef.current?.offsetWidth}
              maxH="300px"
              bg="white"
              borderRadius="base"
              border="1px solid #E8EBF0"
              boxShadow="0px 4px 10px rgba(19, 51, 107, 0.10), 0px 0px 1px rgba(19, 51, 107, 0.10)"
              p="6px"
              overflowY="auto"
              sx={{
                '&::-webkit-scrollbar': {
                  width: '4px'
                },
                '&::-webkit-scrollbar-track': {
                  bg: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  bg: 'rgba(19, 51, 107, 0.2)',
                  borderRadius: '2px'
                }
              }}
              top={(() => {
                if (!buttonRef.current) return 0;
                const rect = buttonRef.current.getBoundingClientRect();
                return `${rect.bottom + 4}px`;
              })()}
              left={(() => {
                if (!buttonRef.current) return 0;
                const rect = buttonRef.current.getBoundingClientRect();
                return `${rect.left}px`;
              })()}
            >
              {list.map((item) => (
                <Box
                  key={item.value}
                  px="3"
                  py="2"
                  color={value === item.value ? 'brightBlue.600' : undefined}
                  borderRadius="4px"
                  transition="colors 0.2s"
                  cursor="pointer"
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)',
                    color: 'brightBlue.600'
                  }}
                  onClick={() => {
                    if (onchange && value !== item.value) {
                      onchange(item.value);
                    }
                    setIsOpen(false);
                  }}
                >
                  {item.label}
                </Box>
              ))}
            </Box>
          </Portal>
        )}
      </Box>
    );
  }
);

export default MySelect;
