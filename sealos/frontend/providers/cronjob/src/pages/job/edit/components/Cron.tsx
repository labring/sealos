import { CronJobEditType } from '@/types/job';
import { getLangStore } from '@/utils/cookieUtils';
import { Box, Flex, Input, Link, Text } from '@chakra-ui/react';
import cronParser from 'cron-parser';
import cronstrue from 'cronstrue';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import Label from './Label';

export default function Cron({ formHook }: { formHook: UseFormReturn<CronJobEditType, any> }) {
  if (!formHook) return <></>;
  const router = useRouter();
  const { t } = useTranslation();
  const { setValue, register, getValues } = formHook;
  const [cronMessage, setCronMessage] = useState('');
  const LANG_KEY = getLangStore() === 'en' ? 'en' : 'zh_CN';
  const isEdit = useMemo(() => !!router.query.name, [router.query.name]);

  const examples = [
    {
      cron: '*/5 * * * *',
      label: 'every five minutes'
    },
    {
      cron: '0 * * * *',
      label: 'per hour'
    },
    {
      cron: '0 8 * * *',
      label: '8 am every day'
    }
  ];

  const getCronMessage = (value: string) => {
    try {
      let nextTime = cronParser.parseExpression(value);
      let _schedule = cronstrue.toString(value, { locale: LANG_KEY });
      setCronMessage(_schedule);
    } catch (error) {
      setCronMessage(typeof error === 'string' ? error : 'Cron Err');
    }
  };

  useEffect(() => {
    const initialCronValue = getValues('schedule');
    getCronMessage(initialCronValue);
  }, [getValues('schedule')]);

  return (
    <Flex alignItems={'start'} mb="32px">
      <Label mt="6px" w={80}>
        {t('Form.Cron Expression')}
      </Label>
      <Flex flexDirection={'column'}>
        <Input
          width={'300px'}
          autoFocus={false}
          placeholder={t('Form.Example') || ''}
          {...register('schedule', {
            required: true,
            onChange: (e: ChangeEvent<HTMLInputElement>) => {
              getCronMessage(e.target.value);
              setValue('schedule', e.target.value);
            }
          })}
        />
        <Flex mt="8px" cursor={'pointer'}>
          {examples.map((item) => (
            <Text
              ml="8px"
              color={'#219BF4'}
              fontSize={'12px'}
              fontWeight={400}
              key={item.cron}
              onClick={() => {
                setValue('schedule', item.cron);
              }}
            >
              {t(item.label)}
            </Text>
          ))}
          <Link
            ml="8px"
            color={'#000000'}
            fontSize={'12px'}
            fontWeight={400}
            href="https://crontab.guru/examples.html"
            isExternal
          >
            {t('examples')}
          </Link>
        </Flex>
      </Flex>
      <Box alignItems={'self-start'} ml="12px" overflowWrap="break-word">
        {cronMessage && `"${cronMessage}"`}
      </Box>
    </Flex>
  );
}
