import { StatusMap } from '@/constants/workorder';
import { WorkOrderStatus } from '@/types/workorder';
import { Box, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

const AppStatusTag = ({
  status,
  showBorder = false
}: {
  status: WorkOrderStatus;
  showBorder: boolean;
}) => {
  const { t } = useTranslation();
  const statusMap = StatusMap[status];

  return (
    <Flex
      color={statusMap.color}
      backgroundColor={statusMap.backgroundColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={statusMap.color}
      py={2}
      px={3}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      w={'88px'}
    >
      <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={statusMap.dotColor}></Box>
      <Box ml={2} flex={1}>
        {t(statusMap.label)}
      </Box>
    </Flex>
  );
};

export default AppStatusTag;
