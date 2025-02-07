import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Grid,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useMediaQuery
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';

import AdvancedSelect from '@/components/AdvancedSelect';
import MyIcon from '@/components/Icon';
import { REFRESH_INTERVAL_OPTIONS } from '@/constants/monitor';
import { LogsFormData } from '@/pages/app/detail/logs';
import useDateTimeStore from '@/store/date';
import { UseFormReturn } from 'react-hook-form';
import { MyTooltip } from '@sealos/ui';

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
  const [isLargerThan1440] = useMediaQuery('(min-width: 1440px)');

  return (
    <Flex
      flexWrap={isLargerThan1440 ? 'nowrap' : 'wrap'}
      gap={'32px'}
      rowGap={'12px'}
      py={'12px'}
      px={'20px'}
      alignItems={'center'}
      w={'100%'}
    >
      <Flex gap={'32px'}>
        <Flex alignItems={'center'} gap={'12px'}>
          <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
            {t('time')}
          </Text>
          <DatePicker />
        </Flex>
        <Flex alignItems={'center'} gap={'12px'}>
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
      </Flex>
      <Flex gap={'32px'}>
        <Flex alignItems={'center'} gap={'12px'}>
          <Text fontSize={'12px'} fontWeight={'400'} lineHeight={'16px'} color={'grayModern.900'}>
            Containers
          </Text>
          <AdvancedSelect
            minW={isLargerThan1440 ? '200px' : '270px'}
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
        <Flex alignItems={'center'} gap={'12px'}>
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
              position={'relative'}
            >
              <MyTooltip label={t('refresh')} hasArrow>
                <Box position={'relative'}>
                  <MyIcon
                    name="refresh"
                    w={'16px'}
                    h={'16px'}
                    color={'grayModern.500'}
                    _hover={{
                      color: 'brightBlue.500'
                    }}
                  />
                </Box>
              </MyTooltip>
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
    </Flex>
  );
};
