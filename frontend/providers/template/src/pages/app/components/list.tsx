import { listInstance } from '@/api/instance';
import { Box, Flex, Grid, Icon, Image, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import MyIcon from '@/components/Icon';

export default function InstanceList() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, refetch } = useQuery(['listInstance'], listInstance, { refetchInterval: 3000 });
  const [instanceName, setInstanceName] = useState('');

  const goInstancePage = (name: string) => {
    if (!name) return;
    router.push({
      pathname: '/instance',
      query: {
        instanceName: name
      }
    });
  };
  if (data && data?.length <= 0) {
    return (
      <Flex flexDirection={'column'} justifyContent={'center'} alignItems={'center'} h="100%">
        <Flex
          border={'1px dashed #9CA2A8'}
          borderRadius="50%"
          w={'48px'}
          h={'48px'}
          justifyContent="center"
          alignItems={'center'}
        >
          <MyIcon color={'#7B838B'} name="empty"></MyIcon>
        </Flex>
        <Text mt={'12px'} fontSize={14} color={'#5A646E'}>
          {t('No Applications')}
        </Text>
      </Flex>
    );
  }

  return (
    <Grid
      justifyContent={'center'}
      w={'100%'}
      gridTemplateColumns="repeat(auto-fill,minmax(344px,1fr))"
      gridGap={'24px'}
      pt="24px"
      pb="42px"
      overflow={'auto'}
      minW={'712px'}
    >
      {data &&
        data?.map((item) => {
          return (
            <Flex
              onClick={() => goInstancePage(item.id)}
              position={'relative'}
              cursor={'pointer'}
              _hover={{
                borderColor: '#36ADEF',
                boxShadow: '0px 4px 5px 0px rgba(185, 196, 205, 0.25)'
              }}
              key={item.id}
              flexDirection={'column'}
              p={'24px'}
              borderRadius={'8px'}
              backgroundColor={'#fff'}
              boxShadow={'0px 2px 4px 0px rgba(187, 196, 206, 0.25)'}
              border={'1px solid #EAEBF0'}
            >
              <Flex alignItems={'center'}>
                <Box
                  p={'6px'}
                  w={'48px'}
                  h={'48px'}
                  boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
                  borderRadius={'4px'}
                  backgroundColor={'#fff'}
                  border={' 1px solid rgba(255, 255, 255, 0.50)'}
                >
                  <Image src={item?.icon} alt="" width={'36px'} height={'36px'} />
                </Box>
                <Box ml="16px">
                  <Text fontSize="16px" fontWeight={500} color="#000000">
                    {item?.displayName ? item.displayName : item?.id}
                  </Text>
                  <Text fontSize={'12px'} color={'#485264'} fontWeight={500}>
                    {item?.id}
                  </Text>
                </Box>
              </Flex>
              <Flex alignItems={'center'} gap={'6px'} h="18px" mt="16px">
                <Icon
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="15px"
                  viewBox="0 0 14 15"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7 2.66056C4.32721 2.66056 2.16049 4.82728 2.16049 7.50007C2.16049 10.1729 4.32721 12.3396 7 12.3396C9.67278 12.3396 11.8395 10.1729 11.8395 7.50007C11.8395 4.82728 9.67278 2.66056 7 2.66056ZM0.993828 7.50007C0.993828 4.18295 3.68288 1.4939 7 1.4939C10.3171 1.4939 13.0062 4.18295 13.0062 7.50007C13.0062 10.8172 10.3171 13.5062 7 13.5062C3.68288 13.5062 0.993828 10.8172 0.993828 7.50007ZM7 3.66303C7.32217 3.66303 7.58333 3.9242 7.58333 4.24637V7.13955L9.43001 8.06289C9.71816 8.20696 9.83496 8.55736 9.69088 8.84551C9.54681 9.13366 9.19641 9.25046 8.90826 9.10639L6.73913 8.02182C6.5415 7.92301 6.41667 7.72102 6.41667 7.50007V4.24637C6.41667 3.9242 6.67783 3.66303 7 3.66303Z"
                    fill="#485264"
                  />
                </Icon>
                <Text fontSize={'12px'} color={'#485264'} fontWeight={400}>
                  {t('Installation Time')}: {item?.createTime}
                </Text>
              </Flex>
            </Flex>
          );
        })}
    </Grid>
  );
}
