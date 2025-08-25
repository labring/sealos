import { Box, BoxProps, Flex, Input, Tag, TagCloseButton, TagLabel } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useCallback, useRef, useState } from 'react';

type Props = BoxProps & { defaultValues: string[]; onUpdate: (e: string[]) => void };

const TagTextarea = ({ defaultValues, onUpdate, ...props }: Props) => {
  const InputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { message: toast } = useMessage();
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
      minH={'100px'}
      borderRadius={'md'}
      border={'1px solid #E8EBF0'}
      p={2}
      fontSize={'sm'}
      bg={'#F7F8FA'}
      {...(focus && {
        boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
        borderColor: '#219BF4',
        bg: '#FFFFFF'
      })}
      {...props}
      onClick={() => {
        if (!focus) {
          InputRef.current?.focus();
          setFocus(true);
        }
      }}
    >
      <Flex alignItems={'center'} gap={2} flexWrap={'wrap'}>
        {tags.map((tag, i) => (
          <Tag key={tag} colorScheme="brightBlue" onClick={(e) => e.stopPropagation()}>
            <TagLabel>{tag}</TagLabel>
            <TagCloseButton
              onClick={() => {
                const val = tags.filter((_, index) => index !== i);
                setTags(val);
                onUpdate(val);
              }}
            />
          </Tag>
        ))}
        <Input
          placeholder={t('enter_save')}
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
        />
      </Flex>
    </Box>
  );
};

export default TagTextarea;
