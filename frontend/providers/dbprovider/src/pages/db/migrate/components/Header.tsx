import MyIcon from '@/components/Icon';
import { DBType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
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
  title: I18nCommonKey;
  dbType: DBType;
  applyCb: () => void;
  applyBtnText: I18nCommonKey;
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
        <MyIcon name="arrowLeft" w={'24px'} />
        <Box fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Button flex={'0 0 140px'} h={'40px'} variant={'solid'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
