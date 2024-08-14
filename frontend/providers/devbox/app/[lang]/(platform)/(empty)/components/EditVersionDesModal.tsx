import { DevboxVersionListItemType } from '@/types/devbox'
import {
  Box,
  Button,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

const EditVersionDesModal = ({
  version,
  onClose,
  isOpen,
  onSuccess
}: {
  version: DevboxVersionListItemType
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) => {
  const t = useTranslations()
  const [inputValue, setInputValue] = useState(version.description)

  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'500px'} mt={'200px'} minH={'300px'}>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            {t('edit_version_description')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Flex alignItems={'start'} gap={'5px'}>
            <Box w={'100px'}>{t('version_description')}</Box>
            <Textarea
              value={inputValue}
              minH={'150px'}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('enter_version_description')}
            />
          </Flex>
        </ModalBody>
        <ModalFooter>
          {/* TODO: 保存逻辑 */}
          <Button ml={3} variant={'solid'} onClick={() => {}}>
            {t('save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditVersionDesModal
