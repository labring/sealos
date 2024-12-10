import MyIcon from '@/components/Icon';
import { useRouter } from '@/i18n';
import { type Tag as TTag } from '@/prisma/generated/client';
import { useDevboxStore } from '@/stores/devbox';
import { useTemplateStore } from '@/stores/template';
import { Box, BoxProps, Button, Flex, Img, MenuButton, Tag, Text, useDisclosure } from '@chakra-ui/react';
import { MyTooltip, SealosMenu } from '@sealos/ui';
import { useLocale, useTranslations } from 'next-intl';
import DeleteTemplateReposistoryModal from '../updateTemplate/DeleteTemplateReposistoryModal';
import EditTemplateModal from '../updateTemplate/EditTemplateReposistoryModal';

const TemplateCard = ({ isPublic, iconId, templateRepositoryName, templateRepositoryDescription
  , templateRepositoryUid,
  inPublicStore = true,
  tags,
  ...props
}: {
  isPublic?: boolean
  iconId: string,
  inPublicStore?: boolean
  templateRepositoryName: string,
  templateRepositoryDescription: string
  templateRepositoryUid: string,
  tags: TTag[]
} & BoxProps) => {
  const t = useTranslations()
  const { closeTemplateModal } = useTemplateStore()
  const editTemplateHandle = useDisclosure()
  const deleteTemplateHandle = useDisclosure()
  const { setStartedTemplate } = useDevboxStore()
  const router = useRouter()
  const lastLang = useLocale()
  return (
    <>
      <Box
        position="relative"
        w="330px"
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap="8px"
        data-group
        {...props}
      >
        <Box
          w="full"
          border="1px solid #E8EBF0"
          borderRadius="8px"
          p="15px 16px"
          bgColor={'grayModern.50'}
          _groupHover={{
            bgColor: 'grayModern.150'
          }
          }
        >
          <Flex justifyContent="space-between" alignItems="center" gap="12px">
            <Flex alignItems="center" gap="12px" flex="1">
              {/* Python Logo */}
              <Img
                boxSize={'32px'}
                src={`/images/${iconId}.svg`}
              />

              {/* Title and Description */}
              <Flex direction="column" gap="3px">
                <Flex gap="8px" width={'full'}>
                  <Text
                    fontSize="16px"
                    fontWeight="500"
                    color="#111824"
                    letterSpacing="0.15px"
                    overflow={'hidden'}
                    maxW={'100px'}
                    textOverflow={'ellipsis'}
                    whiteSpace={'nowrap'}
                  >
                    {templateRepositoryName}
                  </Text>
                  {inPublicStore ?
                    (tags.findIndex(tag => tag.name === 'official') !== -1 ?
                      <MyTooltip label={t('tags_enum.official')} shouldWrapChildren={true} placement='bottom' offset={[0, 15]}>
                        <MyIcon name='official' boxSize={'20px'} position={'relative'} />
                      </MyTooltip>
                      : <></>)
                    :
                    (isPublic ?
                      <Tag
                        size="sm"
                        bg='green.50'
                        color='green.600'
                        border="1px solid"
                        borderColor={'green.200'}
                        borderRadius="33px"
                        px="8px"
                        fontSize="10px"
                      >
                        {t('public')}
                      </Tag> :
                      <Tag
                        size="sm"
                        bg='adora.50'
                        color='adora.600'
                        border="1px solid"
                        borderColor={'adora.200'}
                        borderRadius="33px"
                        px="8px"
                        fontSize="10px"
                      >
                        {t('private')}
                      </Tag>)
                  }
                </Flex>
                <Flex
                  width={'145px'}>
                  <MyTooltip label={templateRepositoryDescription} maxW={'300px'}
                    placement='bottom'
                    offset={[0, 15]}
                  >
                    <Text
                      fontSize="12px"
                      color="#667085"
                      letterSpacing="0.004em"
                      overflow={'hidden'}
                      maxW={'150px'}
                      textOverflow={'ellipsis'}
                      whiteSpace={'nowrap'}
                      h={'16px'}
                    >
                      {templateRepositoryDescription}
                    </Text>
                  </MyTooltip>
                </Flex>

              </Flex>
            </Flex>

            {/* Buttons */}
            <Flex alignItems="center" gap="2px" >
              <Button
                size="sm"
                bg="#0884DD"
                color="white"
                fontSize="12px"
                px="10px"
                h="28px"
                visibility={'hidden'}
                _groupHover={{
                  visibility: 'visible'
                }}
                onClick={() => {
                  setStartedTemplate({
                    uid: templateRepositoryUid,
                    name: templateRepositoryName,
                    iconId
                  })
                  closeTemplateModal()
                  router.push(`/devbox/create?templateRepository${templateRepositoryUid}`)

                }}
                _hover={{ bg: '#0773c4' }}
              >
                {t('start_devbox')}
              </Button>
              {!inPublicStore &&
                <SealosMenu
                  width={100}
                  Button={
                    <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                      <MyIcon name={'more'} color={'grayModern.600'} fill={'currentcolor'} />
                    </MenuButton>
                  }
                  menuList={[
                    {
                      child: (
                        <>
                          <MyIcon name={'edit'} w={'16px'} />
                          <Box ml={2}>{t('edit')}</Box>
                        </>
                      ),
                      onClick: editTemplateHandle.onOpen
                    },
                    {
                      child: (
                        <>
                          <MyIcon name={'delete'} w={'16px'} />
                          <Box ml={2}>{t('delete')}</Box>
                        </>
                      ),
                      onClick: deleteTemplateHandle.onOpen
                    }
                  ]}
                />}
            </Flex>
          </Flex>


        </Box>
        {/* Tags */}
        <Flex gap="4px">
          {tags.map(tag => <Tag
            px={'8px'}
            py={'4px'}
            key={tag.uid}
            bg='brightBlue.50'
            color='brightBlue.600'
            borderRadius="33px"
            fontSize="10px"
          >
            {tag[lastLang === 'zh' ? 'zhName' : 'enName'] || tag.name}
          </Tag>)}
        </Flex>
      </Box>
      <EditTemplateModal
        isOpen={editTemplateHandle.isOpen}
        onClose={editTemplateHandle.onClose}
        uid={templateRepositoryUid}
      />
      <DeleteTemplateReposistoryModal
        isOpen={deleteTemplateHandle.isOpen}
        onClose={deleteTemplateHandle.onClose}
        templateRepositoryName={templateRepositoryName}
        uid={templateRepositoryUid}
      />
    </>
  );
};

export default TemplateCard;