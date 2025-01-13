import { Tabs } from '@sealos/ui';
import { Box, Button, ButtonProps, Flex, Input, Switch, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import MyIcon from '@/components/Icon';
import { MySelect } from '@sealos/ui';

interface JsonModeFormItem {
  jsonKey: string;
  jsonValue: string;
  jsonOperator: '=' | '>' | '<' | 'contains' | 'not_contains';
}

export const Filter = () => {
  const { t } = useTranslation();

  const [activeId, setActiveId] = useState('normal_filter');
  const [openJsonMode, setOpenJsonMode] = useState(false);
  const [openOnlyStderr, setOpenOnlyStderr] = useState(false);
  const [jsonFormList, setJsonFormList] = useState<JsonModeFormItem[]>([]);

  return (
    <Flex p={'12px'} w={'100%'} flexDir={'column'}>
      {/* tab */}
      {/* <Box w={'fit-content'} mb={'18px'}>
        <Tabs
          size={'sm'}
          list={[
            { id: 'normal_filter', label: t('normal_filter') },
            { id: 'advanced_filter', label: t('advanced_filter') }
          ]}
          activeId={activeId}
          onChange={setActiveId}
        />
      </Box> */}
      {/* operator button */}
      <Flex gap={'18px'}>
        <Flex
          alignItems={'center'}
          gap={'12px'}
          bg={openJsonMode ? 'grayModern.50' : 'white'}
          borderRadius={'8px 8px 0px 0px'}
          p={'12px'}
        >
          <Text fontSize={'12px'} fontWeight={'500'} lineHeight={'16px'} color={'grayModern.900'}>
            {t('json_mode')}
          </Text>
          <Switch isChecked={openJsonMode} onChange={() => setOpenJsonMode(!openJsonMode)} />
        </Flex>
        <Flex alignItems={'center'} gap={'12px'}>
          <Text fontSize={'12px'} fontWeight={'500'} lineHeight={'16px'} color={'grayModern.900'}>
            {t('only_stderr')}
          </Text>
          <Switch isChecked={openOnlyStderr} onChange={() => setOpenOnlyStderr(!openOnlyStderr)} />
        </Flex>
        <Flex alignItems={'center'} gap={'12px'}>
          <Input placeholder={t('keyword')} />
          <Button
            size={'sm'}
            variant={'primary'}
            leftIcon={<MyIcon name={'search'} color={'white'} w={'16px'} h={'16px'} />}
          >
            {t('search')}
          </Button>
        </Flex>
      </Flex>
      {/* json mode */}
      {openJsonMode && (
        <Flex
          w={'100%'}
          bg={'grayModern.50'}
          minH={'40px'}
          p={'12px'}
          gap={'12px'}
          flexWrap={'wrap'}
          borderRadius={'0px 8px 8px 8px'}
        >
          {jsonFormList.length === 0 && (
            <AppendJSONFormItemButton
              onClick={() =>
                setJsonFormList([
                  ...jsonFormList,
                  {
                    jsonKey: '',
                    jsonValue: '',
                    jsonOperator: '='
                  }
                ])
              }
            />
          )}
          {jsonFormList.map((item, index) => (
            <Flex key={index} w={'fit-content'} gap={'12px'}>
              <MySelect
                height="32px"
                minW={'200px'}
                bg={'white'}
                color={'grayModern.600'}
                placeholder={t('field_name')}
                value={jsonFormList[0]?.jsonKey}
                list={[
                  { value: 'test', label: 'test' },
                  { value: 'test2', label: 'test2' }
                ]}
                onchange={(val: any) => setJsonFormList(val)}
              />
              <MySelect
                height="32px"
                minW={'60px'}
                bg={'white'}
                color={'grayModern.600'}
                value={jsonFormList[0]?.jsonOperator || '='}
                list={[
                  { value: '=', label: t('equal') },
                  { value: '!=', label: t('not_equal') },
                  { value: 'contains', label: t('contains') },
                  { value: 'not_contains', label: t('not_contains') }
                ]}
                onchange={(val: any) => setJsonFormList(val)}
              />
              <Input
                placeholder={t('value')}
                bg={'white'}
                border={'1px solid #E8EBF0'}
                boxShadow={
                  '0px 1px 2px 0px rgba(19, 51, 107, 0.05),0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
                }
              />
              <Button
                variant={'outline'}
                h={'32px'}
                w={'32px'}
                _hover={{
                  bg: 'grayModern.50'
                }}
                onClick={() => {
                  const newList = [...jsonFormList];
                  newList.splice(index, 1);
                  setJsonFormList(newList);
                }}
              >
                <MyIcon
                  name={'delete'}
                  color={'grayModern.600'}
                  w={'16px'}
                  h={'16px'}
                  _hover={{
                    color: 'red.600'
                  }}
                />
              </Button>
              {index === jsonFormList.length - 1 && (
                <AppendJSONFormItemButton
                  onClick={() =>
                    setJsonFormList([
                      ...jsonFormList,
                      {
                        jsonKey: '',
                        jsonValue: '',
                        jsonOperator: '='
                      }
                    ])
                  }
                />
              )}
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
};

const AppendJSONFormItemButton = (props: ButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button
      variant={'outline'}
      h={'32px'}
      w={'32px'}
      _hover={{
        bg: 'grayModern.50'
      }}
      {...props}
    >
      <MyIcon
        name={'plus'}
        color={'grayModern.600'}
        w={'16px'}
        h={'16px'}
        _hover={{
          color: 'brightBlue.500'
        }}
      />
    </Button>
  );
};
