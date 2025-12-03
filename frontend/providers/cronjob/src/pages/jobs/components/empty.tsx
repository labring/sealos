import React from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import useEnvStore from '@/store/env';
import { useQuotaGuarded } from '@sealos/shared';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { SystemEnv } = useEnvStore();

  const handleCreateApp = useQuotaGuarded(
    {
      requirements: {
        cpu: SystemEnv.podCpuRequest,
        memory: SystemEnv.podMemoryRequest,
        traffic: true
      },
      immediate: false,
      allowContinue: true
    },
    () => {
      router.push('/job/edit');
    }
  );

  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg={'#F3F4F5'}
    >
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('job.You have no tasks yet')}</Box>
      <Button w={155} mt={5} variant={'primary'} onClick={handleCreateApp}>
        {t('job.create')}
      </Button>
    </Box>
  );
};

export default Empty;
