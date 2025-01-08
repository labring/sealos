import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import {
  Button,
  ButtonGroup,
  Flex,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text
} from '@chakra-ui/react';
import { useState } from 'react';
import { ChevronDownIcon } from '@chakra-ui/icons';

import MyIcon from '@/components/Icon';
import MySelect from '@/components/MySelect';

const DatePicker = dynamic(() => import('@/components/DatePicker'), { ssr: false });

export const Header = () => {
  const { t } = useTranslation();

  const [refreshInterval, setRefreshInterval] = useState(0);

  const refreshIntervalList = [
    { value: 0, label: t('close') },
    { value: 1000, label: '1s' },
    { value: 2000, label: '2s' },
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' }
  ];

  return (
    <Flex
      p={'12px'}
      justify={'space-between'}
      gap={'12px'}
      alignItems={'center'}
      w={'100%'}
      flexWrap={'wrap'}
      justifyContent={{ base: 'flex-start', lg: 'space-between' }}
    >
      {/* time */}
      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          {t('time')}
        </Text>
        <DatePicker />
      </Flex>
      {/* pod */}
      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          Pod
        </Text>
        <MySelect
          height="32px"
          leftIcon={<MyIcon name="pods" w={'16px'} h={'16px'} color={'grayModern.500'} />}
          width={'fit-content'}
          value={'hello-sql-postgresql-0'}
          list={[
            { value: 'hello-sql-postgresql-0', label: 'hello-sql-postgresql-0' },
            { value: 'hello-sql-postgresql-1', label: 'hello-sql-postgresql-1' }
          ]}
        />
      </Flex>
      {/* container */}
      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          Container
        </Text>
        <MySelect
          height="32px"
          leftIcon={<MyIcon name="container" w={'16px'} h={'16px'} color={'grayModern.500'} />}
          width={'fit-content'}
          value={'hello-sql-postgresql-0'}
          list={[
            { value: 'hello-sql-postgresql-0', label: 'hello-sql-postgresql-0' },
            { value: 'hello-sql-postgresql-1', label: 'hello-sql-postgresql-1' }
          ]}
        />
      </Flex>
      {/* log number */}
      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          {t('log_number')}
        </Text>
        <Input
          height="32px"
          width={'fit-content'}
          value={'100'}
          onChange={(e) => {
            console.log(e.target.value);
          }}
        />
        <ButtonGroup isAttached variant={'outline'} size={'sm'}>
          <Button
            height="32px"
            bg={'grayModern.50'}
            _hover={{
              bg: 'grayModern.50'
            }}
          >
            <MyIcon
              name="refresh"
              w={'16px'}
              h={'16px'}
              color={'grayModern.500'}
              _hover={{
                color: 'brightBlue.500'
              }}
            />
          </Button>
          <Menu>
            <MenuButton
              as={Button}
              height="32px"
              bg={'grayModern.50'}
              _hover={{
                bg: 'grayModern.50',
                '& div': {
                  color: 'brightBlue.500'
                },
                '& svg': {
                  color: 'brightBlue.500'
                }
              }}
            >
              <Flex alignItems={'center'}>
                {refreshInterval === 0 ? null : (
                  <Text mr={'4px'}>{`${refreshInterval / 1000}s`}</Text>
                )}
                <ChevronDownIcon w={'16px'} h={'16px'} color={'grayModern.500'} />
              </Flex>
            </MenuButton>
            <MenuList
              p={'6px'}
              borderRadius={'base'}
              border={'1px solid #E8EBF0'}
              boxShadow={
                '0px 4px 10px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)'
              }
              zIndex={99}
              overflow={'overlay'}
              maxH={'300px'}
            >
              {refreshIntervalList.map((item) => (
                <MenuItem
                  key={item.value}
                  value={item.value}
                  onClick={() => {
                    setRefreshInterval(item.value);
                  }}
                  {...(refreshInterval === item.value
                    ? {
                        color: 'brightBlue.600'
                      }
                    : {})}
                  borderRadius={'4px'}
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)',
                    color: 'brightBlue.600'
                  }}
                  p={'6px'}
                >
                  {item.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </ButtonGroup>
      </Flex>
    </Flex>
  );
};
