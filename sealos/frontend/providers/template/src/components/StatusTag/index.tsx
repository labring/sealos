import { StatusMapType } from '@/types/status';
import { Box, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

export default function StatusTag({
  status,
  showBorder = false
}: {
  status: StatusMapType;
  showBorder: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Flex
      color={status.color}
      backgroundColor={status.backgroundColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={status.color}
      py={2}
      px={3}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      w={'88px'}
    >
      <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
      <Box ml={2} flex={1}>
        {t(status.label)}
      </Box>
    </Flex>
  );
}
