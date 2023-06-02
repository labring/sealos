import React from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';

const Empty = () => {
  const router = useRouter();
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
      <Box py={8}>您还没有数据库</Box>
      <Button
        w={155}
        mt={5}
        variant={'primary'}
        leftIcon={<MyIcon name="plus" />}
        onClick={() => router.push('/db/edit')}
      >
        新建数据库
      </Button>
    </Box>
  );
};

export default Empty;
