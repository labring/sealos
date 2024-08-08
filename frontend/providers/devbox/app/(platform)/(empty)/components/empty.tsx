import React from 'react'
import { useRouter } from 'next/navigation'
import { Button, Box } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'

import styles from './empty.module.scss'

const Empty = () => {
  const router = useRouter()
  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg={'#F3F4F5'}>
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{'您还没有新建项目'}</Box>
      <Button
        w={155}
        mt={5}
        variant={'solid'}
        onClick={() => router.push('/devbox/create')}
        leftIcon={<MyIcon name={'plus'} w={'20px'} />}>
        {'新建项目'}
      </Button>
    </Box>
  )
}

export default Empty
