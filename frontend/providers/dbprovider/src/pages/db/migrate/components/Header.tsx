import MyIcon from '@/components/Icon';
import { DBType } from '@/types/db';
import { Box, Button, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const Header = ({
  dbName,
  dbType,
  title,
  applyCb,
  applyBtnText
}: {
  dbName: string;
  title: string;
  dbType: DBType;
  applyCb: () => void;
  applyBtnText: string;
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        onClick={() =>
          router.push({
            pathname: '/db/detail',
            query: {
              name: dbName,
              dbType: dbType,
              listType: 'InternetMigration'
            }
          })
        }
      >
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'black'} fontSize={'3xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>

      <Button flex={'0 0 140px'} h={'40px'} variant={'primary'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
