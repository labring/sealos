import MyIcon from '@/components/Icon'
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
import { useMessage } from '@sealos/ui'
import { has } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sealosApp } from 'sealos-desktop-sdk/app'

enum Page {
  REMINDER = 'REMINDER',
  DELETION_WARNING = 'DELETION_WARNING'
}

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
  const [inputValue, setInputValue] = useState(version.description)

  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'500px'} mt={'200px'} minH={'300px'}>
        <ModalHeader>
          <Flex alignItems={'center'} gap={'10px'}>
            编辑版本描述
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'10px'} />
        <ModalBody pb={4}>
          <Flex alignItems={'start'} gap={'5px'}>
            <Box w={'100px'}>版本描述</Box>
            <Textarea
              value={inputValue}
              minH={'150px'}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={'请输入版本描述'}
            />
          </Flex>
        </ModalBody>
        <ModalFooter>
          {/* TODO: 保存逻辑 */}
          <Button ml={3} variant={'solid'} onClick={() => {}}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditVersionDesModal
