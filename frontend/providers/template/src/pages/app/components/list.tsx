import { listInstance } from '@/api/instance';
import { Box, Flex, Grid, Icon, Image, Text, useDisclosure } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import DelModal from './delDodal';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import MyIcon from '@/components/Icon';

export default function InstanceList() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, refetch } = useQuery(['listInstance'], listInstance);
  const [instanceName, setInstanceName] = useState('');

  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();

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
          alignItems={'center'}>
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
      gridTemplateColumns="repeat(auto-fill,minmax(300px,1fr))"
      gridGap={'24px'}
      minW={'765px'}
      pt="24px"
      pr="42px"
      pb="42px"
      overflow={'auto'}>
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
              minH={'214px'}
              // h="214px"
              p={'24px'}
              borderRadius={'8px'}
              backgroundColor={'#fff'}
              boxShadow={'0px 2px 4px 0px rgba(187, 196, 206, 0.25)'}
              border={'1px solid #EAEBF0'}>
              <Box
                p={'6px'}
                w={'48px'}
                h={'48px'}
                boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
                borderRadius={'4px'}
                backgroundColor={'#fff'}
                border={' 1px solid rgba(255, 255, 255, 0.50)'}>
                <Image src={item?.icon} alt="" width={'36px'} height={'36px'} />
              </Box>
              <Text fontSize="24px" fontWeight={600} color="#24282C">
                {item?.id}
              </Text>
              <Text
                pt={'8px'}
                pb="16px"
                fontSize={'12px'}
                color={'#5A646E'}
                fontWeight={400}
                mt="auto">
                {t('Creation Time')}: {item?.createTime}
              </Text>
              <Flex justifyContent={'space-between'} alignItems={'center'} gap={'20px'}>
                <Flex
                  w="100%"
                  h="32px"
                  justifyContent={'center'}
                  alignItems={'center'}
                  cursor={'pointer'}
                  background={'#F4F6F8'}
                  borderRadius={'4px'}>
                  <Icon width="16px" height="17px" viewBox="0 0 16 17" fill="#363C42">
                    <g mask="url(#mask0_821_49862)">
                      <path
                        d="M4.66667 11.8333H9.33333V10.5H4.66667V11.8333ZM4.66667 9.16667H11.3333V7.83333H4.66667V9.16667ZM4.66667 6.5H11.3333V5.16667H4.66667V6.5ZM3.33333 14.5C2.96667 14.5 2.65278 14.3694 2.39167 14.1083C2.13056 13.8472 2 13.5333 2 13.1667V3.83333C2 3.46667 2.13056 3.15278 2.39167 2.89167C2.65278 2.63056 2.96667 2.5 3.33333 2.5H12.6667C13.0333 2.5 13.3472 2.63056 13.6083 2.89167C13.8694 3.15278 14 3.46667 14 3.83333V13.1667C14 13.5333 13.8694 13.8472 13.6083 14.1083C13.3472 14.3694 13.0333 14.5 12.6667 14.5H3.33333ZM3.33333 13.1667H12.6667V3.83333H3.33333V13.1667Z"
                        fill="#363C42"
                      />
                    </g>
                  </Icon>
                  <Text pl="8px " color={'#363C42'} fontWeight={500}>
                    {t('Details')}
                  </Text>
                </Flex>
                {/* <Flex
                  w="100%"
                  h="32px"
                  justifyContent={'center'}
                  alignItems={'center'}
                  cursor={'pointer'}
                  background={'#F4F6F8'}
                  borderRadius={'4px'}
                  onClick={() => {
                    setInstanceName(item.id);
                    onOpenDelModal();
                  }}>
                  <Icon width="16px" height="17px" viewBox="0 0 16 17" fill="#363C42">
                    <path
                      d="M4.66667 14.5C4.30001 14.5 3.98601 14.3693 3.72467 14.108C3.46334 13.8467 3.33289 13.5329 3.33334 13.1667V4.5H2.66667V3.16667H6.00001V2.5H10V3.16667H13.3333V4.5H12.6667V13.1667C12.6667 13.5333 12.536 13.8473 12.2747 14.1087C12.0133 14.37 11.6996 14.5004 11.3333 14.5H4.66667ZM11.3333 4.5H4.66667V13.1667H11.3333V4.5ZM6.00001 11.8333H7.33334V5.83333H6.00001V11.8333ZM8.66667 11.8333H10V5.83333H8.66667V11.8333Z"
                      fill="#363C42"
                    />
                  </Icon>
                  <Text pl="8px " color={'#363C42'} fontWeight={500}>
                    {t('Unload')}
                  </Text>
                </Flex> */}
              </Flex>
            </Flex>
          );
        })}
      {isOpenDelModal && (
        <DelModal
          name={instanceName}
          onClose={onCloseDelModal}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </Grid>
  );
}
