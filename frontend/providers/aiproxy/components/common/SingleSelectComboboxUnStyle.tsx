'use client'
import { Button, InputGroup, Input, ListItem, List, Flex, FlexProps, Box } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useState, ReactNode, useEffect } from 'react'
import { useCombobox, UseComboboxReturnValue } from 'downshift'

export const SingleSelectComboboxUnstyle: <T>(props: {
  dropdownItems: T[]
  setSelectedItem: (value: T) => void
  handleDropdownItemFilter: (dropdownItems: T[], inputValue: string) => T[]
  handleDropdownItemDisplay: (dropdownItem: T) => ReactNode
  handleInputDisplay?: (item: T) => string
  initSelectedItem?: T
  flexProps?: FlexProps
  placeholder?: string
}) => JSX.Element = function <T>({
  dropdownItems,
  setSelectedItem,
  handleDropdownItemFilter,
  handleDropdownItemDisplay,
  handleInputDisplay,
  initSelectedItem,
  flexProps,
  placeholder
}: {
  dropdownItems: T[]
  setSelectedItem: (value: T) => void
  handleDropdownItemFilter: (dropdownItems: T[], inputValue: string) => T[]
  handleDropdownItemDisplay: (dropdownItem: T) => ReactNode
  handleInputDisplay?: (item: T) => string
  initSelectedItem?: T
  flexProps?: FlexProps
  placeholder?: string
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [getFilteredDropdownItems, setGetFilteredDropdownItems] = useState<T[]>(dropdownItems)
  useEffect(() => {
    setGetFilteredDropdownItems(dropdownItems)
  }, [dropdownItems])

  const {
    isOpen: isComboboxOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem
  }: UseComboboxReturnValue<T> = useCombobox({
    items: getFilteredDropdownItems,
    onInputValueChange: ({ inputValue }) => {
      setGetFilteredDropdownItems(handleDropdownItemFilter(dropdownItems, inputValue))
    },
    initialSelectedItem: initSelectedItem || undefined,

    itemToString: (item) => {
      if (!item) return ''
      return handleInputDisplay ? handleInputDisplay(item) : String(item)
    },

    onSelectedItemChange: ({ selectedItem }) => {
      const selectedDropdownItem = dropdownItems.find((item) => item === selectedItem)
      if (selectedDropdownItem) {
        setSelectedItem(selectedDropdownItem)
      }
    }
  })

  return (
    <Flex flexDirection="column" w="full" {...flexProps} position="relative">
      <InputGroup w="full" alignItems="center">
        <Input
          w="full"
          display="flex"
          h="32px"
          py="8px"
          pl="12px"
          pr="44px" // 32 + 12 for the button
          alignItems="center"
          borderRadius="6px"
          border="1px solid var(--Gray-Modern-200, #E8EBF0)"
          bgColor="grayModern.50"
          variant="unstyled"
          placeholder={placeholder}
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={400}
          lineHeight="16px"
          letterSpacing="0.048px"
          _placeholder={{
            color: 'grayModern.500',
            fontFamily: 'PingFang SC',
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: '16px',
            letterSpacing: '0.048px'
          }}
          {...getInputProps()}
        />
        <Button
          position="absolute"
          right={0}
          h="32px"
          w="32px"
          zIndex={1}
          variant="unstyled"
          display="flex"
          alignItems="center"
          justifyContent="center"
          {...getToggleButtonProps()}>
          {isComboboxOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.32148 10.4715C4.58183 10.7318 5.00394 10.7318 5.26429 10.4715L8.79289 6.94289L12.3215 10.4715C12.5818 10.7318 13.0039 10.7318 13.2643 10.4715C13.5246 10.2111 13.5246 9.78903 13.2643 9.52868L9.26429 5.52868C9.00394 5.26833 8.58183 5.26833 8.32148 5.52868L4.32148 9.52868C4.06113 9.78903 4.06113 10.2111 4.32148 10.4715Z"
                fill="#667085"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.32148 5.52851C4.58183 5.26816 5.00394 5.26816 5.26429 5.52851L8.79289 9.05711L12.3215 5.52851C12.5818 5.26816 13.0039 5.26816 13.2643 5.52851C13.5246 5.78886 13.5246 6.21097 13.2643 6.47132L9.26429 10.4713C9.00394 10.7317 8.58183 10.7317 8.32148 10.4713L4.32148 6.47132C4.06113 6.21097 4.06113 5.78886 4.32148 5.52851Z"
                fill="#667085"
              />
            </svg>
          )}
        </Button>
      </InputGroup>
      <List
        position="absolute"
        top="100%" // will display below the flex
        left="0" // width will equal to the flex
        right="0"
        mt="2px"
        w="full"
        py="6px"
        pl="6px"
        pr="6px"
        bg="white"
        boxSizing="border-box"
        alignItems="flex-start"
        boxShadow="0px 12px 16px -4px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)"
        maxH="60"
        minW="0"
        overflowY="auto"
        zIndex="10"
        borderRadius="6px"
        display={isComboboxOpen && getFilteredDropdownItems.length ? 'block' : 'none'}
        {...getMenuProps()}>
        {isComboboxOpen &&
          getFilteredDropdownItems.map((item, index) => (
            <ListItem
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
              _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
              {...getItemProps({ item, index })}>
              {handleDropdownItemDisplay(item)}
            </ListItem>
          ))}
      </List>
    </Flex>
  )
}
