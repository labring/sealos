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

import { useConfirm } from '@/hooks/useConfirm'

const ReleaseModal = ({
  onClose,
  onSuccess,
  devboxId
}: {
  devboxId: string
  onClose: () => void
  onSuccess: () => void
}) => {
  const t = useTranslations()
  const [tag, setTag] = useState('')
  const [inputValue, setInputValue] = useState('')
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'prompt',
    content: 'release_prompt'
  })

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'500px'} mt={'200px'} minH={'300px'}>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            {t('release_version')}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Flex alignItems={'start'} gap={'5px'}>
            <Box w={'100px'}>{t('image_name')}</Box>
            <Input placeholder={'test'} disabled />
          </Flex>
          <Flex alignItems={'start'} gap={'5px'}>
            <Box w={'100px'}>{t('version_number')}</Box>
            <Input
              placeholder={t('enter_version_number')}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
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
            {t('release')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ReleaseModal
