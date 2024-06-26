import MyIcon from '@/components/Icon';
import { useGlobalStore } from '@/store/global';
import { Box, Button, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const Header = ({
  title,
  applyCb,
  applyBtnText
}: {
  title: string;
  applyCb: () => void;
  applyBtnText: string;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace(lastRoute)}>
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'black'} fontSize={'20px'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button
        className="driver-deploy-button"
        px={4}
        minW={'140px'}
        h={'40px'}
        variant={'primary'}
        onClick={applyCb}
        _focusVisible={{ boxShadow: '' }}
      >
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
