import MyIcon from '@/components/Icon';
import {
  Flex,
  Button,
  Text,
  Box,
  BreadcrumbItem,
  BreadcrumbLink,
  Breadcrumb
} from '@chakra-ui/react';
import { t } from 'i18next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const BreadCrumbHeader = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Flex
      w={'100%'}
      h={'50px'}
      justifyContent={'start'}
      alignItems={'center'}
      backgroundColor={'rgba(255, 255, 255)'}
      backdropBlur={'100px'}
    >
      <Box cursor={'pointer'} onClick={() => router.push('/')}>
        <MyIcon name="arrowLeft" color={'#24282C'} w={'16px'} h={'16px'}></MyIcon>
      </Box>
      <Breadcrumb
        ml={'14px'}
        fontWeight={500}
        fontSize={16}
        textDecoration={'none'}
        color={'#7B838B'}
      >
        <BreadcrumbItem textDecoration={'none'}>
          <BreadcrumbLink _hover={{ color: '#219BF4', textDecoration: 'none' }} href="/">
            {t('Template List')}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem color={'#262A32'} isCurrentPage={router.pathname === 'deploy'}>
          <BreadcrumbLink _hover={{ color: '#219BF4', textDecoration: 'none' }} href="#">
            {t('develop.YAML Detection Tool')}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
    </Flex>
  );
};

export default BreadCrumbHeader;
