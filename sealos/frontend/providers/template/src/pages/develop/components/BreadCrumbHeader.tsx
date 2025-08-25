import { useSearchStore } from '@/store/search';
import { ApplicationType } from '@/types/app';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const BreadCrumbHeader = ({
  applyCb,
  applyFormalCb,
  isShowBtn = true
}: {
  applyFormalCb: () => void;
  applyCb: () => void;
  isShowBtn: boolean;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { setAppType } = useSearchStore();

  return (
    <Flex
      w={'100%'}
      h={'50px'}
      justifyContent={'start'}
      alignItems={'center'}
      backgroundColor={'rgba(255, 255, 255)'}
      backdropBlur={'100px'}
    >
      <Flex
        alignItems={'center'}
        fontWeight={500}
        fontSize={16}
        color={'#7B838B'}
        cursor={'pointer'}
      >
        <Flex
          alignItems={'center'}
          css={{
            ':hover': {
              fill: '#219BF4',
              color: '#219BF4',
              '> svg': {
                fill: '#219BF4'
              }
            }
          }}
          onClick={() => {
            router.push('/');
            setAppType(ApplicationType.All);
          }}
        >
          <Icon viewBox="0 0 15 15" fill={'#24282C'} w={'15px'} h="15px">
            <path d="M9.1875 13.1875L3.92187 7.9375C3.85937 7.875 3.81521 7.80729 3.78937 7.73438C3.76312 7.66146 3.75 7.58333 3.75 7.5C3.75 7.41667 3.76312 7.33854 3.78937 7.26562C3.81521 7.19271 3.85937 7.125 3.92187 7.0625L9.1875 1.79687C9.33333 1.65104 9.51562 1.57812 9.73438 1.57812C9.95312 1.57812 10.1406 1.65625 10.2969 1.8125C10.4531 1.96875 10.5312 2.15104 10.5312 2.35938C10.5312 2.56771 10.4531 2.75 10.2969 2.90625L5.70312 7.5L10.2969 12.0938C10.4427 12.2396 10.5156 12.4192 10.5156 12.6325C10.5156 12.8463 10.4375 13.0312 10.2812 13.1875C10.125 13.3438 9.94271 13.4219 9.73438 13.4219C9.52604 13.4219 9.34375 13.3438 9.1875 13.1875Z" />
          </Icon>
          <Text ml="4px">{t('Application List')}</Text>
        </Flex>
        <Text px="6px">/</Text>
        <Text
          _hover={{ fill: '#219BF4', color: '#219BF4' }}
          color={router.pathname === '/develop' ? '#262A32' : '#7B838B'}
        >
          {t('develop.Debugging Template')}
        </Text>
      </Flex>

      <Button ml="auto" px={4} minW={'120px'} h={'34px'} variant={'primary'} onClick={applyCb}>
        {t('develop.Dryrun Deploy')}
      </Button>
      {isShowBtn && (
        <Button
          ml="12px"
          px={4}
          minW={'120px'}
          h={'34px'}
          variant={'primary'}
          onClick={applyFormalCb}
        >
          {t('develop.Formal Deploy')}
        </Button>
      )}
    </Flex>
  );
};

export default BreadCrumbHeader;
