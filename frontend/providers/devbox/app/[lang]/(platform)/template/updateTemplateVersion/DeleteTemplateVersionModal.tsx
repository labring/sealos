import MyIcon from "@/components/Icon"
import { Button, ButtonGroup, Flex, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, ModalProps, Text } from "@chakra-ui/react"
import { useTranslations } from "next-intl"

const DeleteTemplateVersionModal = ({ onSubmit, version, template, isLasted, ...props }: Omit<ModalProps, 'children'> & { onSubmit: () => void, version: string, template: string, isLasted: boolean }) => {
  const t = useTranslations()
  console.log('props', isLasted)
  return (
    <Modal lockFocusAcrossFrames={false} {...props} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent maxW={'400px'} margin={'auto'} >
        <ModalHeader>
          <Flex gap={'10px'}>
            <MyIcon name='warning' boxSize={'20px'} />
            <Text fontSize={'16px'}>{t('prompt')}</Text>
          </Flex>
        </ModalHeader>
        <ModalBody px={'36px'} py={'24px'}>
          <ModalCloseButton />
          {t.rich('delete_template_version_prompt', {
            version: <Text display={'inline'} fontWeight={'600'}>{version}</Text> as any,
            name: <Text display={'inline'} fontWeight={'600'}>{template}</Text> as any
          })
          }
          {
            isLasted && <Text mt={'12px'}>{t('delete_lasted_template_version_prompt')}</Text>
          }
        </ModalBody>
        <ModalFooter pb={'24px'}>
          <ButtonGroup variant={'outline'}>
            <Button
              onClick={() => {
                props.onClose()
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                onSubmit()
                props.onClose()
              }}
              _hover={{
                color: 'red.600',
              }}
            >
              {t('delete')}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
export default DeleteTemplateVersionModal