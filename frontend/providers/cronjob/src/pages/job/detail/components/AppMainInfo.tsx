import { getJobListAndEvents } from '@/api/job';
import MyIcon from '@/components/Icon';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';

export default function AppBaseInfo({ appName }: { appName: string }) {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { data, isLoading } = useQuery(['getJobListAndEvents', appName], () =>
    getJobListAndEvents(appName)
  );
  console.log(data);

  return (
    <Flex flexDirection={'column'} p="36px 64px 0 64px" h="0" flex={1} position={'relative'}>
      <Flex alignItems={'center'} justifyContent={'space-between'} mb="16px">
        <Flex alignItems={'center'}>
          <Icon width="16px" height="16px" viewBox="0 0 16 16">
            <path
              d="M12.6667 10V12.6667H3.33333V10H12.6667ZM13.3333 8.66667H2.66667C2.3 8.66667 2 8.96667 2 9.33333V13.3333C2 13.7 2.3 14 2.66667 14H13.3333C13.7 14 14 13.7 14 13.3333V9.33333C14 8.96667 13.7 8.66667 13.3333 8.66667ZM4.66667 12.3333C4.12 12.3333 3.66667 11.8867 3.66667 11.3333C3.66667 10.78 4.12 10.3333 4.66667 10.3333C5.21333 10.3333 5.66667 10.78 5.66667 11.3333C5.66667 11.8867 5.22 12.3333 4.66667 12.3333ZM12.6667 3.33333V6H3.33333V3.33333H12.6667ZM13.3333 2H2.66667C2.3 2 2 2.3 2 2.66667V6.66667C2 7.03333 2.3 7.33333 2.66667 7.33333H13.3333C13.7 7.33333 14 7.03333 14 6.66667V2.66667C14 2.3 13.7 2 13.3333 2ZM4.66667 5.66667C4.12 5.66667 3.66667 5.22 3.66667 4.66667C3.66667 4.11333 4.12 3.66667 4.66667 3.66667C5.21333 3.66667 5.66667 4.12 5.66667 4.66667C5.66667 5.21333 5.22 5.66667 4.66667 5.66667Z"
              fill="#7B838B"
            />
          </Icon>
          <Text ml="12px">{t('Historical Mission')}</Text>
        </Flex>
        <Text>{data?.total}</Text>
      </Flex>
      <Box py="20px" borderTop={'1px solid #EFF0F1'} flex={1} overflowY={'auto'}>
        {data?.history?.map((jobItem, i) => (
          <Box
            key={jobItem.uid}
            pl={6}
            pb={6}
            ml={4}
            borderLeft={`2px solid ${i === data.history.length - 1 ? 'transparent' : '#DCE7F1'}`}
            position={'relative'}
            _before={{
              content: '""',
              position: 'absolute',
              left: '-6.5px',
              w: '8px',
              h: '8px',
              borderRadius: '8px',
              backgroundColor: '#fff',
              border: '2px solid',
              borderColor: jobItem.status ? '#33BABB' : '#FF8492'
            }}
          >
            <Flex lineHeight={1} mb={2} alignItems={'center'}>
              <Box fontWeight={'bold'}>
                {jobItem.status ? t('base.Success') : t('Pause Error')},
              </Box>
              <Box ml={2} fontWeight={'bold'}>
                {t('Executed')} {jobItem.startTime}
              </Box>
            </Flex>
            <Box color={'blackAlpha.700'}>
              {jobItem?.events?.map((event) => {
                return (
                  <Box key={event.id}>
                    {event.reason},{event.message}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
        {data?.history?.length === 0 && !isLoading && (
          <Flex alignItems={'center'} justifyContent={'center'} flexDirection={'column'} h={'100%'}>
            <MyIcon name="noEvents" w={'48px'} h={'48px'} color={'transparent'} />
            <Box mt={4} color={'myGray.600'}>
              No Events
            </Box>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
