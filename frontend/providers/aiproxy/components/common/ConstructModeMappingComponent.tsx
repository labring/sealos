import React, { useState, useEffect, useMemo } from 'react'
import { Flex, FormLabel, Input, Button, Text, Box, Badge, VStack } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { CustomSelect } from './Select'
type MapKeyValuePair = { key: string; value: string }

type Model = {
  name: string
  isDefault: boolean
}

// mapKeys determines the available selection options
export const ConstructModeMappingComponent = function ({
  mapKeys,
  mapData,
  setMapData
}: {
  mapKeys: Model[]
  mapData: Record<string, string>
  setMapData: (mapping: Record<string, string>) => void
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [mapKeyValuePairs, setMapkeyValuePairs] = useState<Array<MapKeyValuePair>>([
    { key: '', value: '' }
  ])

  const [isInternalUpdate, setIsInternalUpdate] = useState(false)

  useEffect(() => {
    if (!isInternalUpdate) {
      const entries = Object.entries(mapData)
      setMapkeyValuePairs(
        entries.length > 0
          ? entries.map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }]
      )
    }
    setIsInternalUpdate(false)
  }, [mapData])

  const handleDropdownItemDisplay = (dropdownItem: Model | string) => {
    if (dropdownItem === t('channelsFormPlaceholder.modelMappingInput')) {
      return (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontStyle="normal"
          fontWeight={400}
          lineHeight="16px"
          letterSpacing="0.048px">
          {t('channelsFormPlaceholder.modelMappingInput')}
        </Text>
      )
    }

    if ((dropdownItem as Model).isDefault) {
      return (
        <Flex alignItems="center" gap="4px">
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontStyle="normal"
            fontWeight={400}
            lineHeight="16px"
            letterSpacing="0.048px">
            {(dropdownItem as Model).name}
          </Text>
          <Badge
            display="flex"
            padding="4px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="33px"
            background="grayModern.100"
            mixBlendMode="multiply">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.74997 0.714878L8.22533 1.56668L8.22345 1.56993C8.24059 1.57694 8.25731 1.58514 8.27351 1.59449C8.63523 1.80333 8.49477 2.44228 8.09298 2.55641C7.64176 2.68458 7.21349 2.86732 6.81576 3.09704C7.88708 4.08166 8.63497 5.4127 8.88183 6.91256C9.29901 6.66528 9.68171 6.36596 10.021 6.02354C10.3136 5.72817 10.9521 5.92322 10.9521 6.33902V7.99316C10.9521 8.52906 10.6662 9.02425 10.2021 9.2922L8.38215 10.3429L8.37557 10.3315C8.0325 10.4206 7.62541 9.98967 7.73357 9.62836C7.85051 9.2377 7.9264 8.82931 7.95623 8.40819C7.33755 8.59803 6.68053 8.7002 5.99963 8.7002C5.30124 8.7002 4.62795 8.59271 3.99541 8.39338C4.02377 8.80912 4.09702 9.21253 4.21034 9.59881C4.31853 9.96756 3.89749 10.4028 3.55054 10.2939L3.54609 10.3015L1.79785 9.2922C1.33375 9.02425 1.04785 8.52906 1.04785 7.99316V6.33971C1.04785 5.92389 1.68618 5.72882 1.97889 6.02416C2.3065 6.3547 2.67457 6.64506 3.07507 6.88719C3.32615 5.39769 4.07163 4.07611 5.1369 3.09704C4.74758 2.87218 4.329 2.69233 3.88826 2.56461C3.4869 2.4483 3.34916 1.81231 3.71105 1.60337C3.71916 1.59869 3.72741 1.59429 3.73577 1.59019L3.7353 1.58937L5.24997 0.714878C5.71407 0.446928 6.28587 0.446929 6.74997 0.714878ZM5.10359 1.95409C5.4076 2.09475 5.69921 2.25766 5.97633 2.44073C6.26144 2.25239 6.56189 2.08538 6.87539 1.94199L6.24997 1.5809C6.09527 1.49159 5.90467 1.49159 5.74997 1.5809L5.10359 1.95409ZM2.04785 7.40181V7.99316C2.04785 8.1718 2.14315 8.33686 2.29785 8.42618L3.03582 8.85224C3.00038 8.57396 2.98212 8.29031 2.98212 8.0024L2.98216 7.9791C2.65411 7.81211 2.34175 7.61875 2.04785 7.40181ZM8.91302 8.88175L9.70209 8.42618C9.85679 8.33686 9.95209 8.1718 9.95209 7.99316V7.40131C9.64413 7.6287 9.31588 7.83019 8.97055 8.00257C8.97054 8.30061 8.95096 8.59407 8.91302 8.88175ZM7.9346 7.36087C7.33089 7.58044 6.67925 7.7002 5.99963 7.7002C5.30321 7.7002 4.63616 7.57444 4.01995 7.34439C4.18895 5.88454 4.91333 4.59396 5.97633 3.68939C7.04334 4.59736 7.76917 5.89426 7.9346 7.36087Z"
                fill="#667085"
              />
              <path
                d="M8.79009 2.46925C8.65153 2.70844 8.73335 3.01468 8.97274 3.15289L9.70209 3.57399C9.85679 3.6633 9.95209 3.82837 9.95209 4.007V5.01917C9.95209 5.29532 10.1759 5.51917 10.4521 5.51917C10.7282 5.51917 10.9521 5.29532 10.9521 5.01917V4.007C10.9521 3.4711 10.6662 2.97591 10.2021 2.70796L9.47274 2.28687C9.23384 2.14894 8.92837 2.23055 8.79009 2.46925Z"
                fill="#667085"
              />
              <path
                d="M7.51448 10.2665C7.65255 10.5057 7.57062 10.8115 7.33147 10.9496L6.74997 11.2853C6.28587 11.5532 5.71407 11.5532 5.24997 11.2853L4.66318 10.9465C4.42378 10.8083 4.34197 10.502 4.48053 10.2629C4.61881 10.0242 4.92428 9.94254 5.16318 10.0805L5.74997 10.4193C5.90467 10.5086 6.09527 10.5086 6.24997 10.4193L6.83147 10.0835C7.07062 9.94546 7.37641 10.0274 7.51448 10.2665Z"
                fill="#667085"
              />
              <path
                d="M1.54785 5.52476C1.27171 5.52476 1.04785 5.3009 1.04785 5.02476V4.007C1.04785 3.4711 1.33375 2.97591 1.79785 2.70796L2.51571 2.29351C2.75485 2.15544 3.06065 2.23737 3.19872 2.47652C3.33679 2.71567 3.25485 3.02146 3.01571 3.15953L2.29785 3.57399C2.14315 3.6633 2.04785 3.82837 2.04785 4.007V5.02476C2.04785 5.3009 1.82399 5.52476 1.54785 5.52476Z"
                fill="#667085"
              />
            </svg>
          </Badge>
        </Flex>
      )
    }
    return (
      <Text
        color="grayModern.600"
        fontFamily="PingFang SC"
        fontSize="12px"
        fontStyle="normal"
        fontWeight={400}
        lineHeight="16px"
        letterSpacing="0.048px">
        {(dropdownItem as Model).name}
      </Text>
    )
  }

  const handleSeletedItemDisplay = (selectedItem: Model | string) => {
    if (selectedItem === t('channelsFormPlaceholder.modelMappingInput')) {
      return (
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontStyle="normal"
          fontWeight={400}
          lineHeight="16px"
          letterSpacing="0.048px">
          {t('channelsFormPlaceholder.modelMappingInput')}
        </Text>
      )
    }

    if ((selectedItem as Model).isDefault) {
      return (
        <Flex
          alignItems="center"
          gap="4px"
          maxWidth="120px" // overflowX needed width
          overflow="hidden" // ensure the overflow content is hidden
        >
          <Box
            overflowX="auto" // overflowX needed for long text
            whiteSpace="nowrap" // prevent text from wrapping
            css={{
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontStyle="normal"
              fontWeight={400}
              lineHeight="16px"
              letterSpacing="0.048px"
              whiteSpace="nowrap" // prevent text from wrapping
            >
              {(selectedItem as Model).name}
            </Text>
          </Box>
          <Badge
            flexShrink={0}
            display="flex"
            padding="4px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="33px"
            background="grayModern.100"
            mixBlendMode="multiply">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.74997 0.714878L8.22533 1.56668L8.22345 1.56993C8.24059 1.57694 8.25731 1.58514 8.27351 1.59449C8.63523 1.80333 8.49477 2.44228 8.09298 2.55641C7.64176 2.68458 7.21349 2.86732 6.81576 3.09704C7.88708 4.08166 8.63497 5.4127 8.88183 6.91256C9.29901 6.66528 9.68171 6.36596 10.021 6.02354C10.3136 5.72817 10.9521 5.92322 10.9521 6.33902V7.99316C10.9521 8.52906 10.6662 9.02425 10.2021 9.2922L8.38215 10.3429L8.37557 10.3315C8.0325 10.4206 7.62541 9.98967 7.73357 9.62836C7.85051 9.2377 7.9264 8.82931 7.95623 8.40819C7.33755 8.59803 6.68053 8.7002 5.99963 8.7002C5.30124 8.7002 4.62795 8.59271 3.99541 8.39338C4.02377 8.80912 4.09702 9.21253 4.21034 9.59881C4.31853 9.96756 3.89749 10.4028 3.55054 10.2939L3.54609 10.3015L1.79785 9.2922C1.33375 9.02425 1.04785 8.52906 1.04785 7.99316V6.33971C1.04785 5.92389 1.68618 5.72882 1.97889 6.02416C2.3065 6.3547 2.67457 6.64506 3.07507 6.88719C3.32615 5.39769 4.07163 4.07611 5.1369 3.09704C4.74758 2.87218 4.329 2.69233 3.88826 2.56461C3.4869 2.4483 3.34916 1.81231 3.71105 1.60337C3.71916 1.59869 3.72741 1.59429 3.73577 1.59019L3.7353 1.58937L5.24997 0.714878C5.71407 0.446928 6.28587 0.446929 6.74997 0.714878ZM5.10359 1.95409C5.4076 2.09475 5.69921 2.25766 5.97633 2.44073C6.26144 2.25239 6.56189 2.08538 6.87539 1.94199L6.24997 1.5809C6.09527 1.49159 5.90467 1.49159 5.74997 1.5809L5.10359 1.95409ZM2.04785 7.40181V7.99316C2.04785 8.1718 2.14315 8.33686 2.29785 8.42618L3.03582 8.85224C3.00038 8.57396 2.98212 8.29031 2.98212 8.0024L2.98216 7.9791C2.65411 7.81211 2.34175 7.61875 2.04785 7.40181ZM8.91302 8.88175L9.70209 8.42618C9.85679 8.33686 9.95209 8.1718 9.95209 7.99316V7.40131C9.64413 7.6287 9.31588 7.83019 8.97055 8.00257C8.97054 8.30061 8.95096 8.59407 8.91302 8.88175ZM7.9346 7.36087C7.33089 7.58044 6.67925 7.7002 5.99963 7.7002C5.30321 7.7002 4.63616 7.57444 4.01995 7.34439C4.18895 5.88454 4.91333 4.59396 5.97633 3.68939C7.04334 4.59736 7.76917 5.89426 7.9346 7.36087Z"
                fill="#667085"
              />
              <path
                d="M8.79009 2.46925C8.65153 2.70844 8.73335 3.01468 8.97274 3.15289L9.70209 3.57399C9.85679 3.6633 9.95209 3.82837 9.95209 4.007V5.01917C9.95209 5.29532 10.1759 5.51917 10.4521 5.51917C10.7282 5.51917 10.9521 5.29532 10.9521 5.01917V4.007C10.9521 3.4711 10.6662 2.97591 10.2021 2.70796L9.47274 2.28687C9.23384 2.14894 8.92837 2.23055 8.79009 2.46925Z"
                fill="#667085"
              />
              <path
                d="M7.51448 10.2665C7.65255 10.5057 7.57062 10.8115 7.33147 10.9496L6.74997 11.2853C6.28587 11.5532 5.71407 11.5532 5.24997 11.2853L4.66318 10.9465C4.42378 10.8083 4.34197 10.502 4.48053 10.2629C4.61881 10.0242 4.92428 9.94254 5.16318 10.0805L5.74997 10.4193C5.90467 10.5086 6.09527 10.5086 6.24997 10.4193L6.83147 10.0835C7.07062 9.94546 7.37641 10.0274 7.51448 10.2665Z"
                fill="#667085"
              />
              <path
                d="M1.54785 5.52476C1.27171 5.52476 1.04785 5.3009 1.04785 5.02476V4.007C1.04785 3.4711 1.33375 2.97591 1.79785 2.70796L2.51571 2.29351C2.75485 2.15544 3.06065 2.23737 3.19872 2.47652C3.33679 2.71567 3.25485 3.02146 3.01571 3.15953L2.29785 3.57399C2.14315 3.6633 2.04785 3.82837 2.04785 4.007V5.02476C2.04785 5.3009 1.82399 5.52476 1.54785 5.52476Z"
                fill="#667085"
              />
            </svg>
          </Badge>
        </Flex>
      )
    }
    return (
      <Box
        maxWidth="114px"
        overflowX="auto" // overflowX needed for long text
        whiteSpace="nowrap" // prevent text from wrapping
        css={{
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontStyle="normal"
          fontWeight={400}
          lineHeight="16px"
          letterSpacing="0.048px">
          {(selectedItem as Model).name}
        </Text>
      </Box>
    )
  }

  // Handling mapData and mapKeyValuePairs cleanup when map keys change.
  useEffect(() => {
    // 1. Handle mapData cleanup
    const removedKeys = Object.keys(mapData).filter(
      (key) => !mapKeys.some((model) => model.name === key)
    )
    if (removedKeys.length > 0) {
      // If there are mappings with removed keys, delete them
      const newMapData = { ...mapData }
      removedKeys.forEach((key) => {
        delete newMapData[key]
      })
      setIsInternalUpdate(true)
      setMapData(newMapData)
    }

    // 2. Handle mapKeyValuePairs cleanup
    const removedPairs = mapKeyValuePairs.filter(
      (pair) => pair.key && !mapKeys.some((model) => model.name === pair.key)
    )
    if (removedPairs.length > 0) {
      const newMapKeyValuePairs = mapKeyValuePairs.filter(
        (pair) => !pair.key || mapKeys.some((model) => model.name === pair.key)
      )
      setMapkeyValuePairs(newMapKeyValuePairs)
    }
  }, [mapKeys])

  // Get the keys that have been selected
  const getSelectedMapKeys = (currentIndex: number) => {
    const selected = new Set<string>()
    mapKeyValuePairs.forEach((mapKeyValuePair, idx) => {
      if (idx !== currentIndex && mapKeyValuePair.key) {
        selected.add(mapKeyValuePair.key)
      }
    })
    return selected
  }

  // Handling adding a new row
  const handleAddNewMapKeyPair = () => {
    setMapkeyValuePairs([...mapKeyValuePairs, { key: '', value: '' }])
  }

  // Handling deleting a row
  const handleRemoveMapKeyPair = (index: number) => {
    const mapKeyValuePair = mapKeyValuePairs[index]
    const newMapData = { ...mapData }
    if (mapKeyValuePair.key) {
      delete newMapData[mapKeyValuePair.key]
    }
    setIsInternalUpdate(true)
    setMapData(newMapData)

    const newMapKeyValuePairs = mapKeyValuePairs.filter((_, idx) => idx !== index)
    setMapkeyValuePairs(newMapKeyValuePairs)
  }

  // Handling selection/input changes
  const handleInputChange = (index: number, field: 'key' | 'value', value: string) => {
    const newMapKeyValuePairs = [...mapKeyValuePairs]
    const oldValue = newMapKeyValuePairs[index][field]
    newMapKeyValuePairs[index][field] = value

    // Update the mapping relationship
    const newMapData = { ...mapData }
    if (field === 'key') {
      if (oldValue) delete newMapData[oldValue]

      if (!value) {
        newMapKeyValuePairs[index].value = ''
      }

      if (value && newMapKeyValuePairs[index].value) {
        newMapData[value] = newMapKeyValuePairs[index].value
      }
    } else {
      if (newMapKeyValuePairs[index].key) {
        newMapData[newMapKeyValuePairs[index].key] = value
      }
    }

    setMapkeyValuePairs(newMapKeyValuePairs)
    setIsInternalUpdate(true)
    setMapData(newMapData)
  }

  // Check if there are still keys that can be selected
  const hasAvailableKeys = useMemo(() => {
    const usedKeys = new Set(
      mapKeyValuePairs.map((mapKeyValuePair) => mapKeyValuePair.key).filter(Boolean)
    )
    return (
      mapKeyValuePairs.length < mapKeys.length &&
      mapKeys.some((mapKey) => !usedKeys.has(mapKey.name))
    )
  }, [mapKeys, mapKeyValuePairs])

  return (
    <VStack w="full" align="stretch" alignItems="flex-start" spacing="8px">
      <FormLabel
        whiteSpace="nowrap"
        color="grayModern.900"
        fontFamily="PingFang SC"
        fontSize="14px"
        fontStyle="normal"
        fontWeight={500}
        lineHeight="20px"
        letterSpacing="0.1px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        h="20px"
        m={0}>
        {t('channelsForm.model_mapping')}
      </FormLabel>

      {mapKeyValuePairs.map((row, index) => (
        <Flex key={`${index}-${row.key}`} gap="8px" w="full" alignItems="center">
          <Box flex={1}>
            <CustomSelect<Model>
              listItems={mapKeys.filter((model) => !getSelectedMapKeys(index).has(model.name))}
              initSelectedItem={row.key ? mapKeys.find((item) => item.name === row.key) : undefined}
              // when select placeholder, the newSelectedItem is null
              handleSelectedItemChange={(newSelectedItem) => {
                if (newSelectedItem) {
                  handleInputChange(index, 'key', newSelectedItem.name)
                } else {
                  handleInputChange(index, 'key', '')
                }
              }}
              handleDropdownItemDisplay={handleDropdownItemDisplay}
              handleSelectedItemDisplay={handleSeletedItemDisplay}
              placeholder={t('channelsFormPlaceholder.modelMappingInput')}
            />
          </Box>

          <Box flex="1" flexShrink={0}>
            <Input
              w="full"
              h="32px"
              value={row.value}
              onChange={(e) => handleInputChange(index, 'value', e.target.value)}
              placeholder={t('channelsFormPlaceholder.modelMappingOutput')}
              py="8px"
              px="12px"
              borderRadius="6px"
              border="1px solid var(--Gray-Modern-200, #E8EBF0)"
              bgColor="white"
              _hover={{ borderColor: 'grayModern.300' }}
              _focus={{ borderColor: 'grayModern.300' }}
              _focusVisible={{ borderColor: 'grayModern.300' }}
              _active={{ borderColor: 'grayModern.300' }}
              sx={{
                '&::placeholder': {
                  color: 'grayModern.500',
                  fontFamily: '"PingFang SC"',
                  fontSize: '12px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '16px',
                  letterSpacing: '0.048px'
                }
              }}
            />
          </Box>

          <Button
            h="32px"
            w="32px"
            variant="ghost"
            onClick={() => handleRemoveMapKeyPair(index)}
            display="flex"
            p="7px"
            alignItems="center"
            gap="6px"
            borderRadius="6px"
            _hover={{
              bg: 'rgba(17, 24, 36, 0.05)',
              color: '#D92D20'
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="18"
              viewBox="0 0 19 18"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.34847 1.32764H10.5129C10.8763 1.32762 11.1931 1.32761 11.4548 1.34899C11.7321 1.37164 12.0127 1.42198 12.2841 1.56028C12.6858 1.76491 13.0123 2.09144 13.2169 2.49306C13.3552 2.76449 13.4056 3.04513 13.4282 3.32237C13.4462 3.54294 13.4491 3.80273 13.4495 4.09652H16.1607C16.5749 4.09652 16.9107 4.43231 16.9107 4.84652C16.9107 5.26074 16.5749 5.59652 16.1607 5.59652H15.5262V12.63C15.5262 13.1855 15.5262 13.6474 15.4954 14.0244C15.4634 14.4171 15.3942 14.7832 15.2181 15.1287C14.9471 15.6606 14.5147 16.093 13.9828 16.364C13.6374 16.54 13.2713 16.6092 12.8786 16.6413C12.5016 16.6721 12.0397 16.6721 11.4842 16.6721H8.37716C7.82169 16.6721 7.35977 16.6721 6.98277 16.6413C6.5901 16.6092 6.22398 16.54 5.87851 16.364C5.34664 16.093 4.91422 15.6606 4.64321 15.1287C4.46719 14.7832 4.39799 14.4171 4.36591 14.0244C4.33511 13.6474 4.33512 13.1855 4.33513 12.63L4.33513 5.59652H3.70068C3.28647 5.59652 2.95068 5.26074 2.95068 4.84652C2.95068 4.43231 3.28647 4.09652 3.70068 4.09652H6.41187C6.4123 3.80273 6.41512 3.54294 6.43314 3.32237C6.4558 3.04513 6.50613 2.76449 6.64443 2.49306C6.84907 2.09144 7.1756 1.76491 7.57722 1.56028C7.84864 1.42198 8.12929 1.37164 8.40653 1.34899C8.66821 1.32761 8.98509 1.32762 9.34847 1.32764ZM5.83513 5.59652V12.5994C5.83513 13.1933 5.83571 13.5936 5.86093 13.9023C5.88543 14.2022 5.9294 14.3489 5.97972 14.4477C6.10692 14.6973 6.30987 14.9003 6.5595 15.0275C6.65826 15.0778 6.80501 15.1218 7.10492 15.1463C7.41358 15.1715 7.81389 15.1721 8.40779 15.1721H11.4536C12.0475 15.1721 12.4478 15.1715 12.7564 15.1463C13.0563 15.1218 13.2031 15.0778 13.3019 15.0275C13.5515 14.9003 13.7544 14.6973 13.8816 14.4477C13.932 14.3489 13.9759 14.2022 14.0004 13.9023C14.0256 13.5936 14.0262 13.1933 14.0262 12.5994V5.59652H5.83513ZM11.9494 4.09652H7.91192C7.91246 3.80578 7.91512 3.60411 7.92816 3.44452C7.94324 3.26004 7.96834 3.19877 7.98094 3.17405C8.04177 3.05467 8.13883 2.95761 8.2582 2.89679C8.28293 2.88419 8.3442 2.85908 8.52868 2.84401C8.72191 2.82822 8.97684 2.82764 9.3769 2.82764H10.4845C10.8845 2.82764 11.1394 2.82822 11.3327 2.84401C11.5172 2.85908 11.5784 2.88419 11.6032 2.89679C11.7225 2.95761 11.8196 3.05467 11.8804 3.17405C11.893 3.19877 11.9181 3.26004 11.9332 3.44452C11.9462 3.60411 11.9489 3.80578 11.9494 4.09652ZM8.54624 7.90374C8.96045 7.90374 9.29624 8.23953 9.29624 8.65374V12.1149C9.29624 12.5291 8.96045 12.8649 8.54624 12.8649C8.13202 12.8649 7.79624 12.5291 7.79624 12.1149V8.65374C7.79624 8.23953 8.13202 7.90374 8.54624 7.90374ZM11.3151 7.90374C11.7293 7.90374 12.0651 8.23953 12.0651 8.65374V12.1149C12.0651 12.5291 11.7293 12.8649 11.3151 12.8649C10.9009 12.8649 10.5651 12.5291 10.5651 12.1149V8.65374C10.5651 8.23953 10.9009 7.90374 11.3151 7.90374Z"
                fill="currentcolor"
              />
            </svg>
          </Button>
        </Flex>
      ))}

      {hasAvailableKeys && (
        <Button
          h="32px"
          variant="unstyled"
          onClick={handleAddNewMapKeyPair}
          w="full"
          display="flex"
          p="8px 14px"
          justifyContent="center"
          alignItems="center"
          gap="6px"
          alignSelf="stretch"
          borderRadius="6px"
          border="1px solid var(--Gray-Modern-250, #DFE2EA)"
          bg="white"
          boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.93068 2.6665C9.29887 2.6665 9.59735 2.96498 9.59735 3.33317V7.33317H13.5974C13.9655 7.33317 14.264 7.63165 14.264 7.99984C14.264 8.36803 13.9655 8.6665 13.5974 8.6665H9.59735V12.6665C9.59735 13.0347 9.29887 13.3332 8.93068 13.3332C8.56249 13.3332 8.26402 13.0347 8.26402 12.6665V8.6665H4.26402C3.89583 8.6665 3.59735 8.36803 3.59735 7.99984C3.59735 7.63165 3.89583 7.33317 4.26402 7.33317H8.26402V3.33317C8.26402 2.96498 8.56249 2.6665 8.93068 2.6665Z"
              fill="#485264"
            />
          </svg>
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('channelsForm.add')}
          </Text>
        </Button>
      )}
    </VStack>
  )
}
export default ConstructModeMappingComponent
