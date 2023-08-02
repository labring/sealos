import { Box, Flex } from '@chakra-ui/react';
import React from 'react';
import MyIcon from '../Icon';
import { GpuType } from '@/types/app';
import { useTranslation } from 'next-i18next';

const GPUItem = ({ gpu }: { gpu?: GpuType }) => {
  const { t } = useTranslation();
  return (
    <Flex whiteSpace={'nowrap'}>
      <MyIcon name={'nvidia'} w={'16px'} mr={2} />
      {gpu?.type && (
        <>
          <Box>{gpu.type}</Box>
          <Box mx={1} color={'myGray.400'}>
            /
          </Box>
        </>
      )}
      <Box color={!!gpu?.amount ? 'myGray.600' : 'myGray.400'}>
        {!!gpu?.type ? gpu?.amount : 0}

        {t('Card')}
      </Box>
    </Flex>
  );
};

export default GPUItem;
