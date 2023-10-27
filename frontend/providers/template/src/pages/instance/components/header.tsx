import { getInstanceByName } from '@/api/instance';
import { Box, Flex, Image, Text, Icon, useDisclosure } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import DelModal from './delDodal';
import { useTranslation } from 'next-i18next';
import { useResourceStore } from '@/store/resource';

export default function Header({ instanceName }: { instanceName: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { appendResource } = useResourceStore();

  const { data } = useQuery(
    ['getInstanceByName', instanceName],
    () => getInstanceByName(instanceName),
    {
      onSuccess(data) {
        appendResource([{ id: data.id, name: data.id, kind: 'Instance' }]);
      }
    }
  );

  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();

  return (
    <Flex
      pt="24px"
      pb="20px"
      pl="24px"
      pr="36px"
      alignItems={'center'}
      borderBottom={'1px solid rgba(0, 0, 0, 0.07)'}
    >
      <Icon
        cursor={'pointer'}
        width="35px"
        height="36px"
        viewBox="0 0 35 36"
        fill="#5A646E"
        onClick={() => router.push('/app')}
      >
        <path d="M20.3207 27L11.6118 18L20.3207 9L22.3527 11.1L15.676 18L22.3527 24.9L20.3207 27Z" />
      </Icon>
      <Box
        ml="10px"
        p={'6px'}
        w={'44px'}
        h={'44px'}
        boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
        borderRadius={'4px'}
        backgroundColor={'#fff'}
        border={' 1px solid rgba(255, 255, 255, 0.50)'}
      >
        <Image src={data?.icon} alt="" width={'32px'} height={'32px'} />
      </Box>
      <Text fontWeight={600} fontSize={'18px'} ml="16px">
        {data?.id}
      </Text>
      <Flex
        ml="auto"
        w="156px"
        h="42px"
        justifyContent={'center'}
        alignItems={'center'}
        cursor={'pointer'}
        background={'#FFF'}
        borderRadius={'4px'}
        border={'1px solid #DEE0E2'}
        onClick={onOpenDelModal}
      >
        <Icon width="16px" height="17px" viewBox="0 0 16 17" fill="#121416">
          <path d="M4.66667 14.5C4.30001 14.5 3.98601 14.3693 3.72467 14.108C3.46334 13.8467 3.33289 13.5329 3.33334 13.1667V4.5H2.66667V3.16667H6.00001V2.5H10V3.16667H13.3333V4.5H12.6667V13.1667C12.6667 13.5333 12.536 13.8473 12.2747 14.1087C12.0133 14.37 11.6996 14.5004 11.3333 14.5H4.66667ZM11.3333 4.5H4.66667V13.1667H11.3333V4.5ZM6.00001 11.8333H7.33334V5.83333H6.00001V11.8333ZM8.66667 11.8333H10V5.83333H8.66667V11.8333Z" />
        </Icon>
        <Text pl="8px " color={'#24282C'} fontWeight={600}>
          {t('Unload')}
        </Text>
      </Flex>
      {/* <Flex
        ml="14px"
        w="156px"
        h="42px"
        justifyContent={'center'}
        alignItems={'center'}
        cursor={'pointer'}
        background={'#24282C'}
        borderRadius={'4px'}>
        <Icon width="16px" height="16px" viewBox="0 0 16 16" fill="#FFFFFF">
          <path d="M12.6625 7.27812L3.9625 2.1C3.85625 2.0375 3.74688 2 3.62188 2C3.28125 2 3.00312 2.28125 3.00312 2.625H3V13.375H3.00312C3.00312 13.7188 3.28125 14 3.62188 14C3.75 14 3.85625 13.9563 3.97187 13.8938L12.6625 8.72188C12.8688 8.55 13 8.29063 13 8C13 7.70937 12.8688 7.45312 12.6625 7.27812Z" />
        </Icon>
        <Text pl="8px " color={'#FFF'} fontWeight={600}>
          启动
        </Text>
      </Flex> */}
      {isOpenDelModal && (
        <DelModal
          name={instanceName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/app')}
        />
      )}
    </Flex>
  );
}
