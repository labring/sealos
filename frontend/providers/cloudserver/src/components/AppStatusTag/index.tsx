import { StatusMap } from '@/constants/vm';
import { PhaseEnum } from '@/types/cloudserver';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

const AppStatusTag = ({
  status,
  showBorder = false
}: {
  status: PhaseEnum;
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
      px={'12px'}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      w={'88px'}
    >
      <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={statusMap.dotColor}></Box>
      <Flex alignItems={'center'} justifyContent={'space-between'} ml={'6px'} flex={1} gap={'1px'}>
        {t(statusMap.label)}
        {status?.includes('ing') && <Spinner size={'xs'} />}
      </Flex>
    </Flex>
  );
};

export default AppStatusTag;
