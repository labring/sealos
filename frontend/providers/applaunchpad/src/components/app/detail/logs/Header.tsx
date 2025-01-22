import { ChevronDownIcon } from '@chakra-ui/icons';
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
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';

import AdvancedSelect from '@/components/AdvancedSelect';
import MyIcon from '@/components/Icon';
import { REFRESH_INTERVAL_OPTIONS } from '@/constants/monitor';
import { LogsFormData } from '@/pages/app/detail/logs';
import useDateTimeStore from '@/store/date';
import { UseFormReturn } from 'react-hook-form';

const DatePicker = dynamic(() => import('@/components/DatePicker'), { ssr: false });

export const Header = ({
  formHook,
  refetchData
}: {
  formHook: UseFormReturn<LogsFormData>;
  refetchData: () => void;
}) => {
  const { t } = useTranslation();
  const { refreshInterval, setRefreshInterval } = useDateTimeStore();

  return (
    <Flex p={'12px'} gap={'32px'} alignItems={'center'} w={'100%'} flexWrap={'wrap'}>
      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          {t('time')}
        </Text>
        <DatePicker />
      </Flex>

      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          Pods
        </Text>
        <AdvancedSelect
          placeholder={t('please_select')}
          height="32px"
          minW={'200px'}
          checkBoxMode
          leftIcon={<MyIcon name="pods" w={'16px'} h={'16px'} color={'grayModern.500'} />}
          width={'fit-content'}
          value={'hello-sql-postgresql-0'}
          onCheckboxChange={(val) => {
            formHook.setValue('pods', val);
          }}
          list={formHook.watch('pods')}
        />
      </Flex>

      <Flex alignItems={'center'} gap={'12px'}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          Containers
        </Text>
        <AdvancedSelect
          minW={{ lg: '322px', xl: '200px' }}
          placeholder={t('please_select')}
          height="32px"
          checkBoxMode
          leftIcon={<MyIcon name="container" w={'16px'} h={'16px'} color={'grayModern.500'} />}
          value={'hello-sql-postgresql-0'}
          list={formHook.watch('containers')}
          onCheckboxChange={(val) => {
            formHook.setValue('containers', val);
          }}
        />
      </Flex>

      <Flex alignItems={'center'} gap={'12px'} minW={{ base: '45%', lg: 'auto' }}>
        <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
          {t('log_number')}
        </Text>
        <Input
          height="32px"
          width={'fit-content'}
          value={formHook.watch('limit')}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (isNaN(val)) {
              formHook.setValue('limit', 1);
            } else if (val > 500) {
              formHook.setValue('limit', 500);
            } else if (val < 1) {
              formHook.setValue('limit', 1);
            } else {
              formHook.setValue('limit', val);
            }
          }}
        />
        <ButtonGroup isAttached variant={'outline'} size={'sm'}>
          <Button
            height="32px"
            bg={'grayModern.50'}
            _hover={{
              bg: 'grayModern.50'
            }}
            onClick={() => {
              refetchData();
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
              {REFRESH_INTERVAL_OPTIONS.map((item) => (
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
