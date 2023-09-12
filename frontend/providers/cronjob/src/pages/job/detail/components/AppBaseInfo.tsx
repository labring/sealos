import { getJobListEventsAndLogs } from '@/api/job';
import MyTooltip from '@/components/MyTooltip';
import { CronJobTypeList } from '@/constants/job';
import { useJobStore } from '@/store/job';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import React, { useMemo } from 'react';

export default function AppBaseInfo({ appName }: { appName: string }) {
  const { t } = useTranslation();
  const { JobDetail, loadJobDetail } = useJobStore();
  const { copyData } = useCopyData();

  const { data, isLoading } = useQuery(
    ['getJobListEventsAndLogs', appName],
    () => getJobListEventsAndLogs(appName),
    {
      onError(err) {
        console.log(err);
      }
    }
  );

  const [totalAmount, successAmount, failAmount] = useMemo(() => {
    if (data?.total) {
      return [data?.total, data?.successAmount, data.total - data.successAmount];
    } else {
      return [0, 0, 0];
    }
  }, [data]);

  const jobType = useMemo(
    () => CronJobTypeList.find((i) => i.id === JobDetail.jobType),
    [JobDetail]
  );

  const appInfoTable = useMemo<
    {
      label: string;
      value?: string;
      copy?: string;
      render?: React.ReactNode;
    }[]
  >(
    () => [
      {
        label: 'Type',
        render: (
          <Flex
            h="28px"
            p={'12px'}
            backgroundColor={'#F8FAFB'}
            border={'1px solid #EFF0F1'}
            borderRadius={'24px'}
            justifyContent={'center'}
            alignItems={'center'}
          >
            {t(jobType?.label || 'Form.Visit Url')}
          </Flex>
        )
      },
      {
        label: 'Form.Image Name',
        value: JobDetail.imageName
      },
      {
        label: 'Creation Time',
        value: JobDetail.creatTime
      },
      {
        label: 'Form.Command',
        copy: JobDetail.runCMD,
        value: JobDetail.runCMD
      },
      {
        label: 'Form.Parameters',
        copy: JobDetail.cmdParam,
        value: JobDetail.cmdParam
      }
    ],
    [JobDetail, jobType, t]
  );

  return (
    <Box p="54px 60px 26px 60px" position={'relative'}>
      <Flex justifyContent={'center'} alignItems={'center'}>
        <Icon w="18px" h="18px" mr="8px" viewBox={'0 0 18 18'}>
          <path
            d="M9 17C4.85775 17 1.5 13.6423 1.5 9.5C1.5 5.35775 4.85775 2 9 2C13.1423 2 16.5 5.35775 16.5 9.5C16.5 13.6423 13.1423 17 9 17ZM9 15.5C10.5913 15.5 12.1174 14.8679 13.2426 13.7426C14.3679 12.6174 15 11.0913 15 9.5C15 7.9087 14.3679 6.38258 13.2426 5.25736C12.1174 4.13214 10.5913 3.5 9 3.5C7.4087 3.5 5.88258 4.13214 4.75736 5.25736C3.63214 6.38258 3 7.9087 3 9.5C3 11.0913 3.63214 12.6174 4.75736 13.7426C5.88258 14.8679 7.4087 15.5 9 15.5ZM9.75 9.5H12.75V11H8.25V5.75H9.75V9.5Z"
            fill="#5A646E"
          />
        </Icon>
        <Text fontWeight={500} color={'#24282C'}>
          {t('Schedule')}
        </Text>
      </Flex>
      <Text textAlign={'center'} mt="12px" color={'#24282C'} fontSize={'24px'} fontWeight={500}>
        {JobDetail._schedule}
      </Text>
      <Flex mt="32px" justifyContent={'center'} alignItems={'center'} textAlign={'center'}>
        <Box>
          <Text color={'#5A646E'}>{t('Succeeded')}</Text>
          <Text fontWeight={500} mt="12px">
            {successAmount}
          </Text>
        </Box>
        <Box w="1px" h="30px" backgroundColor={'#DEE0E2'} mx={'30px'}></Box>
        <Box>
          <Text color={'#5A646E'}>{t('Failures')}</Text>
          <Text fontWeight={500} mt="12px">
            {failAmount}
          </Text>
        </Box>
        <Box w="1px" h="30px" backgroundColor={'#DEE0E2'} mx={'30px'}></Box>
        <Box>
          <Text color={'#5A646E'}>{t('Next Execution Time')}</Text>
          <Text fontWeight={500} mt="12px">
            {JobDetail.nextExecutionTime}
          </Text>
        </Box>
      </Flex>
      <Box mt="32px" w="100%" h="1px" backgroundColor={'#EFF0F1'}></Box>
      <Box mt="32px">
        <Text color={'#24282C'} fontWeight={500} mb="12px">
          {t('Basic Information')}
        </Text>
        {appInfoTable.map((item) => {
          return (
            <Flex
              key={item.label}
              h="32px"
              mb="8px"
              justifyContent={'space-between'}
              alignItems={'center'}
            >
              <Text color={'#5A646E'} fontSize={'14px'} flex={'0 0 80px'}>
                {t(item.label)}
              </Text>
              <MyTooltip label={item.value}>
                <Box
                  color={'#000000'}
                  textOverflow={'ellipsis'}
                  whiteSpace={'nowrap'}
                  overflow={'hidden'}
                  cursor={!!item.copy ? 'pointer' : 'default'}
                  onClick={() => item.value && !!item.copy && copyData(item.copy)}
                >
                  {item.render ? item.render : item.value}
                </Box>
              </MyTooltip>
            </Flex>
          );
        })}
      </Box>
    </Box>
  );
}
