import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  BoxProps,
  Flex,
  Input,
  InputProps,
  Tag,
  TagCloseButton,
  TagLabel,
  useToast
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

type Props = BoxProps & {
  defaultValues: string[];
  onUpdate: (e: string[]) => void;
  inputStyle?: InputProps;
};

const TagTextarea = ({ defaultValues, onUpdate, inputStyle, ...props }: Props) => {
  const InputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const toast = useToast();
  const [focus, setFocus] = useState(false);
  const [tags, setTags] = useState<string[]>(defaultValues);

  const onUpdateValue = useCallback(
    (value?: string, type: 'create' | 'delete' = 'create') => {
      setFocus(false);
      if (type === 'create') {
        if (!value || !InputRef.current?.value) {
          return;
        }
        if (tags.includes(value)) {
          return toast({
            status: 'info',
            title: t('common.input.Repeat Value'),
            position: 'top',
            duration: 2000
          });
        }
        setTags([...tags, value]);
        onUpdate([...tags, value]);
        InputRef.current.value = '';
      } else {
        if (tags.length === 0) {
          return toast({
            status: 'info',
            title: t('common.input.No Elements to Delete'),
            position: 'top',
            duration: 2000
          });
        }
        // Delete the last element
        tags.pop();
        setTags(tags);
        onUpdate(tags);
      }
    },
    [onUpdate, t, tags, toast]
  );

  return (
    <Box
      w={'100%'}
      minH={'32px'}
      borderRadius={'2px'}
      border={'1px solid #DEE0E2'}
      p={2}
      fontSize={'sm'}
      bg={'#FBFBFC'}
      {...(focus && {
        boxShadow: '0px 0px 4px #A8DBFF',
        borderColor: 'blue.600',
        bg: '#FFFFFF'
      })}
      {...props}
      onClick={() => {
        if (!focus) {
          InputRef.current?.focus();
          setFocus(true);
        }
      }}
      overflowY={'auto'}
    >
      <Flex alignItems={'center'} gap={2} flexWrap={'wrap'}>
        {tags.map((tag, i) => (
          <Tag
            fontSize={'12px'}
            fontWeight={400}
            key={tag}
            colorScheme="blue"
            onClick={(e) => e.stopPropagation()}
          >
            <TagLabel>{tag}</TagLabel>
            <TagCloseButton
              css={{
                svg: {
                  width: '14px',
                  height: '14px'
                }
              }}
              onClick={() => {
                const val = tags.filter((_, index) => index !== i);
                setTags(val);
                onUpdate(val);
              }}
            />
          </Tag>
        ))}
        <Input
          placeholder={t('Enter Save') || ''}
          ref={InputRef}
          variant={'unstyled'}
          display={'inline-block'}
          flex={1}
          onBlur={(e) => {
            const value = e.target.value;
            onUpdateValue(value);
          }}
          onKeyDown={(e) => {
            if (e.keyCode === 13) {
              e.preventDefault();
              onUpdateValue(InputRef.current?.value);
            }
            if (e.keyCode === 8 && InputRef.current?.value === '') {
              e.preventDefault();
              onUpdateValue(InputRef.current?.value, 'delete');
            }
          }}
          {...inputStyle}
        />
      </Flex>
    </Box>
  );
};

export default TagTextarea;
