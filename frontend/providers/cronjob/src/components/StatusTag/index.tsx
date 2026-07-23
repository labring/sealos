import type { CronJobStatusMapType } from '@/types/job';
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import MyIcon from '../Icon';

const DBStatusTag = ({
  status,
  showBorder = false
}: {
  status: CronJobStatusMapType;
  showBorder?: boolean;
}) => {
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
      minW={'88px'}
      whiteSpace={'nowrap'}
    >
      <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
      <Box ml={2} flex={1}>
        {t(status.label)}
      </Box>
    </Flex>
  );
};

export default DBStatusTag;
