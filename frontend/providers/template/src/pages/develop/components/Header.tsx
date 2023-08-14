import MyIcon from '@/components/Icon';
import { Flex, Button, Text, Box } from '@chakra-ui/react';
import { t } from 'i18next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const Header = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Flex h="80px" w="100%" alignItems={'center'}>
      <Flex alignItems={'center'} onClick={() => router.push('/')}>
        <Box cursor={'pointer'}>
          <MyIcon name="arrowLeft" color={'#24282C'} w={'20px'} h={'20px'}></MyIcon>
        </Box>
        <Text color={'#121416'} fontSize={'24px'} fontWeight={600}>
          模板开发
        </Text>
      </Flex>
      <Button
        h={'40px'}
        ml={'auto'}
        mr={5}
        px={4}
        minW={'140px'}
        bg={'myWhite.600'}
        borderColor={'myGray.200'}
        variant={'base'}
      >
        {t('Export')} Yaml
      </Button>
      <Button px={4} minW={'140px'} h={'40px'} variant={'primary'}>
        {t('develop.publish')}
      </Button>
    </Flex>
  );
};

export default Header;
