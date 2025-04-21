'use client';

import {
  Box,
  Flex,
  HStack,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
  VStack,
  Text
} from '@chakra-ui/react';
import { CSSProperties, memo, useRef, useState } from 'react';

function AutoComplete({
  selectList,
  value,
  setValue,
  supportNewValue = true,
  inputPlaceholder = 'Search or create...',
  inputSureToCreate = 'Create',
  inputNotSupportToCreate = 'Not support'
}: {
  selectList: string[];
  value: string;
  setValue: (value: any) => void;
  supportNewValue?: boolean;
  inputPlaceholder?: string; // When there is no input in the Input box, prompt text
  inputSureToCreate?: string; // When the Input box has content and it is a new resource that does not exist, prompt text
  inputNotSupportToCreate?: string; // When the Input box has input content, but does not support creating new content, prompt text
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDatabaseNameSelect = (databasename: string) => {
    setInputValue(databasename);
    setValue(databasename);
    handler.onClose();
  };
  const handler = useDisclosure();

  const handleCreateDatabaseName = () => {
    if (supportNewValue) {
      setValue(inputValue);
      handler.onClose();
    }
  };

  const svgStyle: CSSProperties = {
    display: 'inline-block',
    lineHeight: '1em',
    color: '#667085',
    flexShrink: 0,
    verticalAlign: 'text-Top',
    fill: 'currentColor',
    width: '16px',
    height: '16px'
  };
  return (
    <>
      <Popover
        placement="bottom-start"
        isOpen={handler.isOpen}
        onOpen={() => {
          handler.onOpen();
          inputRef.current?.focus();
        }}
        onClose={handler.onClose}
      >
        <PopoverTrigger>
          <Flex
            width={'350px'}
            bgColor={'grayModern.50'}
            border={'1px solid'}
            borderColor={'grayModern.200'}
            borderRadius={'6px'}
            py={'8px'}
            px={'12px'}
            justify={'space-between'}
          >
            <Text fontSize={'12px'} width={400}>
              {value}
            </Text>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              focusable="false"
              style={svgStyle}
            >
              <path d="M14.337 6.667c1.485 0 2.228 1.795 1.178 2.845l-4.25 4.25c-.65.65-1.706.65-2.357 0l-4.25-4.25c-1.05-1.05-.306-2.845 1.179-2.845h8.5Z"></path>
            </svg>
          </Flex>
        </PopoverTrigger>
        <PopoverContent onFocus={() => inputRef.current?.focus()}>
          <PopoverBody
            p="6px"
            width="280px"
            boxShadow="box-shadow: 0px 0px 1px 0px #13336B1A,box-shadow: 0px 4px 10px 0px #13336B1A"
            border="none"
            borderRadius="6px"
          >
            <Input
              ref={inputRef}
              width="full"
              height="32px"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              autoFocus={true}
              border="1px solid #219BF4"
              boxShadow="0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)"
              borderRadius="4px"
              fontSize="12px"
              placeholder={inputPlaceholder}
              _focus={{
                border: '1px solid #219BF4',
                boxShadow: '0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)'
              }}
            />
            <VStack spacing="0" align="stretch" mt={'4px'} maxH={'200px'} overflow={'auto'}>
              {selectList
                .filter((v) => v.toLowerCase().includes(inputValue.toLowerCase()))
                .map((v) => (
                  <Box
                    key={v}
                    p="8px 12px"
                    borderRadius={'4px'}
                    fontSize="12px"
                    cursor="pointer"
                    _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                    onClick={() => handleDatabaseNameSelect(v)}
                  >
                    {v}
                  </Box>
                ))}

              {inputValue && !selectList.find((v) => v === inputValue) && (
                <HStack
                  p="8px 12px"
                  spacing="8px"
                  cursor="pointer"
                  _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                  onClick={handleCreateDatabaseName}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    focusable="false"
                    style={svgStyle}
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M8 2.667c.368 0 .667.298.667.666v4h4a.667.667 0 1 1 0 1.334h-4v4a.667.667 0 1 1-1.334 0v-4h-4a.667.667 0 0 1 0-1.334h4v-4c0-.368.299-.666.667-.666Z"
                    ></path>
                  </svg>
                  <Text fontSize="12px" lineHeight="16px" letterSpacing="0.004em" color="#111824">
                    {supportNewValue
                      ? `${inputSureToCreate} ${inputValue}`
                      : inputNotSupportToCreate}
                  </Text>
                </HStack>
              )}
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </>
  );
}

export default memo(AutoComplete);
