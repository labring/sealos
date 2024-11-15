import { Box } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

import MyIcon from '@/components/Icon'
import { useRouter } from '@/i18n'

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
    </Box>
  )
}

export default Empty
