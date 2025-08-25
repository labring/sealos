import { Flex, Center, Text } from '@chakra-ui/react';
import { WarnTriangleIcon } from '@sealos/ui';
import { EmptyIcon } from '../icons';
import { blurBackgroundStyles } from './index';
import { useTranslation } from 'next-i18next';

export default function Warn() {
  const { t } = useTranslation();
  return (
    <Flex
      flexDirection={'column'}
      flex={'0 1 400px'}
      pt={'20px '}
      px={'16px'}
      position={'relative'}
      {...blurBackgroundStyles}
    >
      <Flex flex={1} flexDirection={'column'} gap={'6px'}>
        <Flex alignItems={'center'} gap={'6px'}>
          <WarnTriangleIcon />
          <Text color={'rgba(255, 255, 255, 0.90)'} fontWeight={'bold'} fontSize={'14px'}>
            {t('common:alerts')}
          </Text>
        </Flex>
        <Center flex={1}>
          <Center
            w={'32px'}
            h={'32px'}
            borderRadius={'full'}
            border={'1px dashed rgba(255, 255, 255, 0.70)'}
          >
            <EmptyIcon width={'16px'} height={'16px'} />
          </Center>
        </Center>
      </Flex>
    </Flex>
  );
}
