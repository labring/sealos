'use client'
import { Box, Text, ListItem, List } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ReactNode } from 'react'
import { useSelect } from 'downshift'

export const CustomSelect = function <T>({
  listItems,
  handleSelectedItemChange,
  handleDropdownItemDisplay,
  handleSelectedItemDisplay,
  placeholder,
  initSelectedItem
}: {
  listItems: T[]
  handleSelectedItemChange: (selectedItem: T) => void
  handleDropdownItemDisplay: (dropdownItem: T) => ReactNode
  handleSelectedItemDisplay: (selectedItem: T) => ReactNode
  placeholder?: string
  initSelectedItem?: T
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const items = [placeholder, ...listItems]

  const {
    isOpen,
    selectedItem,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    highlightedIndex
  } = useSelect({
    items: items,
    initialSelectedItem: initSelectedItem,
    onSelectedItemChange: ({ selectedItem: newSelectedItem }) => {
      if (newSelectedItem === placeholder) {
        handleSelectedItemChange(undefined as T)
      } else {
        handleSelectedItemChange(newSelectedItem as T)
      }
    }
  })

  return (
    <Box w="full" position="relative" flex={1}>
      <Box
        h="32px"
        w="full"
        borderRadius="6px"
        border="1px solid var(--Gray-Modern-200, #E8EBF0)"
        bgColor="white"
        color="grayModern.900"
        display="flex"
        alignItems="center"
        {...getToggleButtonProps()}
        _hover={{ borderColor: 'grayModern.300' }}
        px="12px">
        {selectedItem ? (
          handleSelectedItemDisplay(selectedItem as T)
        ) : placeholder ? (
          <Text
            flex={1}
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={400}
            lineHeight="16px"
            letterSpacing="0.048px"
            color={selectedItem ? 'grayModern.900' : 'grayModern.500'}>
            {placeholder}
          </Text>
        ) : (
          <Text
            flex={1}
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={400}
            lineHeight="16px"
            letterSpacing="0.048px"
            color={selectedItem ? 'grayModern.900' : 'grayModern.500'}>
            Select
          </Text>
        )}
        <Box ml="auto" transform={isOpen ? 'rotate(180deg)' : undefined}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Box>
      </Box>

      <List
        {...getMenuProps()}
        position="absolute"
        mt="2px"
        w="full"
        py="6px"
        pl="6px"
        pr="6px"
        bg="white"
        alignItems="flex-start"
        boxShadow="0px 12px 16px -4px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)"
        maxH="60"
        overflowY="auto"
        zIndex="10"
        borderRadius="6px"
        display={isOpen && items.length ? 'block' : 'none'}>
        {isOpen &&
          items.map((item, index) => (
            <ListItem
              {...getItemProps({ item, index })}
              key={index}
              display="flex"
              padding="8px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              bg={highlightedIndex === index ? 'rgba(17, 24, 36, 0.05)' : 'transparent'}
              fontWeight={selectedItem === item ? 'bold' : 'normal'}
              cursor="pointer"
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontStyle="normal"
              lineHeight="16px"
              letterSpacing="0.5px"
              _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}>
              {handleDropdownItemDisplay(item as T)}
            </ListItem>
          ))}
      </List>
    </Box>
  )
}
