import { useTranslations } from 'next-intl'
import { Button, Box } from '@chakra-ui/react'

import { useRouter } from '@/i18n'
import MyIcon from '@/components/Icon'

import styles from './empty.module.scss'

const Empty = () => {
  const router = useRouter()
  const t = useTranslations()

  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg={'#F3F4F5'}>
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('devbox_empty')}</Box>
      <Button
        w={170}
        mt={5}
        variant={'solid'}
        onClick={() => router.push('/devbox/create')}
        leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#ffffff'} />}>
        {t('create_devbox')}
      </Button>
    </Box>
  )
}

export default Empty
