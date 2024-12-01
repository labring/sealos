'use client'
import React, { useState } from 'react'
import {
  Flex,
  Text,
  Button,
  Input,
  IconButton,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  HStack,
  FlexProps
} from '@chakra-ui/react'
import { EditIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'

interface EditableTextProps {
  value: string | number
  label: string
  onSubmit: (value: string) => void
  flexProps?: FlexProps
}

export const EditableText = ({ value, label, onSubmit, flexProps }: EditableTextProps) => {
  const [editValue, setEditValue] = useState(value.toString())
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleSubmit = () => {
    onSubmit(editValue)
    onClose()
  }

  const handleCancel = () => {
    setEditValue(value.toString())
    onClose()
  }

  return (
    <Flex alignItems="center" gap="16px" justifyContent="space-between" {...flexProps}>
      <Text>{label}</Text>
      <Popover isOpen={isOpen} onClose={handleCancel} placement="bottom-end">
        <PopoverTrigger>
          <Flex alignItems="center" gap="2">
            <Text>{value}</Text>
            <IconButton
              aria-label="Edit"
              icon={<EditIcon />}
              variant="ghost"
              size="sm"
              onClick={onOpen}
            />
          </Flex>
        </PopoverTrigger>
        <PopoverContent width="200px">
          <PopoverBody>
            <Flex direction="column" gap="2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                size="sm"
                autoFocus
              />
              <HStack justifyContent="flex-end" spacing="2">
                <IconButton
                  aria-label="Cancel"
                  icon={<CloseIcon />}
                  size="sm"
                  onClick={handleCancel}
                />
                <IconButton
                  aria-label="Submit"
                  icon={<CheckIcon />}
                  size="sm"
                  colorScheme="blue"
                  onClick={handleSubmit}
                />
              </HStack>
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  )
}
