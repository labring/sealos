'use client'
import React, { useState } from 'react'
import {
  Flex,
  Text,
  Button,
  Input,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  HStack,
  FlexProps,
  Box
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'

interface EditableTextProps {
  value: string | number
  label: string
  onSubmit: (value: string) => void
  flexProps?: FlexProps
}

export const EditableText = ({ value, label, onSubmit, flexProps }: EditableTextProps) => {
  const [editValue, setEditValue] = useState(String(value))
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleSubmit = () => {
    onSubmit(editValue)
    onClose()
  }

  const handleCancel = () => {
    // 关闭时 恢复到传递来的初始值
    setEditValue(String(value))
    onClose()
  }

  return (
    <Flex alignItems="center" gap="16px" justifyContent="space-between" {...flexProps}>
      <Text
        color="grayModern.600"
        fontFamily="PingFang SC"
        fontSize="14px"
        fontStyle="normal"
        fontWeight="500"
        lineHeight="20px"
        letterSpacing="0.1px">
        {label}
      </Text>
      <Popover isOpen={isOpen} onClose={handleCancel} placement="bottom-end">
        <PopoverTrigger>
          <Flex alignItems="center" gap="8px">
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="14px"
              fontStyle="normal"
              fontWeight="400"
              lineHeight="20px"
              letterSpacing="0.25px">
              {value}
            </Text>
            <Button
              onClick={onOpen}
              variant="ghost"
              size="sm"
              display="flex"
              p="4px"
              alignItems="center"
              gap="6px"
              borderRadius="6px">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none">
                <path
                  d="M2.35532 12.6736C2.34997 12.6822 2.34494 12.691 2.34024 12.7C2.29614 12.7849 2.29614 12.8965 2.29614 13.1195V13.4633C2.29614 13.6864 2.29614 13.7979 2.34024 13.8828C2.3774 13.9544 2.43573 14.0127 2.50727 14.0499C2.59216 14.094 2.70369 14.094 2.92675 14.094H3.26459C3.45553 14.094 3.56475 14.094 3.64549 14.0663C3.65082 14.0648 3.65613 14.0632 3.66142 14.0615C3.79824 14.0182 3.91653 13.8999 4.15312 13.6633L11.6771 6.13933L10.254 4.7162L2.72999 12.2402C2.52747 12.4427 2.41162 12.5586 2.35532 12.6736Z"
                  fill="#485264"
                />
                <path
                  d="M12.8543 4.96222L11.4311 3.53909L12.758 2.21221C12.7756 2.1946 12.7847 2.18549 12.7924 2.17817C13.171 1.81561 13.7681 1.81561 14.1468 2.17817C14.1544 2.1855 14.1633 2.19435 14.1809 2.21201L14.1815 2.21263C14.1991 2.23014 14.2079 2.23896 14.2152 2.24659C14.5777 2.62526 14.5777 3.2223 14.2152 3.60097C14.2078 3.60866 14.1989 3.61755 14.1811 3.63534L12.8543 4.96222Z"
                  fill="#485264"
                />
                <path
                  d="M7.19259 13.3011C7.19259 12.8632 7.54756 12.5083 7.98544 12.5083H14.7723C15.2102 12.5083 15.5651 12.8632 15.5651 13.3011C15.5651 13.739 15.2102 14.094 14.7723 14.094H7.98544C7.54756 14.094 7.19259 13.739 7.19259 13.3011Z"
                  fill="#485264"
                />
              </svg>
            </Button>
          </Flex>
        </PopoverTrigger>
        <PopoverContent w="150px">
          <PopoverBody>
            <Flex direction="column" gap="6px">
              <Input
                fontFamily="PingFang SC"
                fontSize="14px"
                fontStyle="normal"
                fontWeight="400"
                lineHeight="20px"
                letterSpacing="0.25px"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                minW="0"
                w="full"
                h="28px"
                borderRadius="6px"
                border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                bgColor="white"
                _hover={{ borderColor: 'grayModern.300' }}
                _focus={{ borderColor: 'grayModern.300' }}
                _focusVisible={{ borderColor: 'grayModern.300' }}
                _active={{ borderColor: 'grayModern.300' }}
                autoFocus
              />
              <HStack justifyContent="flex-end" spacing="6px">
                <Button
                  h="24px"
                  w="32px"
                  justifyContent="center"
                  alignItems="center"
                  borderRadius="6px"
                  bg="grayModern.900"
                  boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                  color="white"
                  transition="all 0.2s ease"
                  _hover={{
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s ease'
                  }}
                  _active={{
                    transform: 'scale(0.92)',
                    animation: 'pulse 0.3s ease'
                  }}
                  sx={{
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.92)' },
                      '50%': { transform: 'scale(0.96)' },
                      '100%': { transform: 'scale(0.92)' }
                    }
                  }}
                  onClick={handleCancel}>
                  <CloseIcon />
                </Button>
                <Button
                  h="24px"
                  w="32px"
                  justifyContent="center"
                  alignItems="center"
                  borderRadius="6px"
                  bg="grayModern.900"
                  boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                  color="white"
                  transition="all 0.2s ease"
                  _hover={{
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s ease'
                  }}
                  _active={{
                    transform: 'scale(0.92)',
                    animation: 'pulse 0.3s ease'
                  }}
                  sx={{
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.92)' },
                      '50%': { transform: 'scale(0.96)' },
                      '100%': { transform: 'scale(0.92)' }
                    }
                  }}
                  onClick={handleSubmit}>
                  <CheckIcon />
                </Button>
              </HStack>
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  )
}
