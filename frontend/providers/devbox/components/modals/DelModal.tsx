import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import MyIcon from '@/components/Icon'
import { delDevbox } from '@/api/devbox'
import { DevboxListItemType } from '@/types/devbox'

const DelModal = ({
  devbox,
  onClose,
  onSuccess
}: {
  devbox: DevboxListItemType
  onClose: () => void
  onSuccess: () => void
}) => {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const { message: toast } = useMessage()

  const handleDelDevbox = useCallback(async () => {
    try {
      setLoading(true)
      const networks = devbox.networks.map((item) => item.networkName)
      await delDevbox(devbox.name, networks)
      toast({
        title: t('delete_successful'),
        status: 'success'
      })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || t('delete_failed'),
        status: 'error'
      })
      console.error(error)
    }
    setLoading(false)
  }, [devbox.networks, devbox.name, toast, t, onSuccess, onClose])

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            <MyIcon name="warning" width={'20px'} h={'20px'} />
            {t('delete_warning')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>{t('delete_warning_content')}</ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'outline'}>
            {t('cancel')}
          </Button>
          <Button ml={3} variant={'solid'} isLoading={loading} onClick={handleDelDevbox}>
            {t('confirm_delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default DelModal
