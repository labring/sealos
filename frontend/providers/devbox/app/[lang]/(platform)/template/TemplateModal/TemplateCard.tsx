import MyIcon from '@/components/Icon';
import { useRouter } from '@/i18n';
import { type Tag as TTag } from '@/prisma/generated/client';
import { useDevboxStore } from '@/stores/devbox';
import { useTemplateStore } from '@/stores/template';
import {
  Box,
  BoxProps,
  Button,
  Flex,
  Img,
  MenuButton,
  Tag,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip, SealosMenu } from '@sealos/ui';
import { useLocale, useTranslations } from 'next-intl';
import DeleteTemplateReposistoryModal from '../updateTemplate/DeleteTemplateReposistoryModal';
import EditTemplateModal from '../updateTemplate/EditTemplateModal';
import EditTemplateRepositoryModal from '../updateTemplate/EditTemplateReposistoryModal';
const TemplateCard = ({
  isPublic,
  iconId,
  templateRepositoryName,
  templateRepositoryDescription,
  templateRepositoryUid,
  isDisabled = false,
  inPublicStore = true,
  tags,
  ...props
}: {
  isPublic?: boolean;
  iconId: string;
  isDisabled?: boolean;
  inPublicStore?: boolean;
  templateRepositoryName: string;
  templateRepositoryDescription: string | null;
  templateRepositoryUid: string;
  tags: TTag[];
} & BoxProps) => {
  const t = useTranslations();
  const { closeTemplateModal, config, updateTemplateModalConfig } = useTemplateStore();
  const editTemplateHandle = useDisclosure();
  const editTemplateRepositoryHandle = useDisclosure();
  const deleteTemplateHandle = useDisclosure();
  const { setStartedTemplate } = useDevboxStore();
  const router = useRouter();
  const description = templateRepositoryDescription
    ? templateRepositoryDescription
    : t('no_description');
  const lastLang = useLocale();
  return (
    <>
      <Box
        position="relative"
        width={'full'}
        _before={
          isDisabled
            ? {
                content: "''",
                position: 'absolute',
                inset: 0,
                background: '#fff',
                opacity: 0.3,
                'pointer-events': 'none'
              }
            : {}
        }
        display="flex"
        maxW={'440px'}
        flexDirection="column"
        alignItems="flex-start"
        gap="12px"
        data-group
        {...props}
        bgColor={'grayModern.50'}
        _groupHover={{
          bgColor: 'grayModern.150'
        }}
        border="1px solid #E8EBF0"
        borderRadius="8px"
        px="20px"
        pt={'16px'}
        pb={'12px'}
      >
        <Box w="full" height={'44px'}>
          <Flex justifyContent="space-between" alignItems="center" gap="12px" height={'full'}>
            <Flex alignItems="center" gap="12px" flex="1" height={'full'} width={'0'}>
              {/* Python Logo */}
              <Img boxSize={'32px'} src={`/images/${iconId}.svg`} />

              {/* Title and Description */}
              <Flex direction="column" gap="3px" flex={1} width={0}>
                <Flex gap="8px" width={'full'}>
                  <Text
                    fontSize="16px"
                    fontWeight="500"
                    color="#111824"
                    letterSpacing="0.15px"
                    overflow={'hidden'}
                    flex={'0 1 auto'}
                    textOverflow={'ellipsis'}
                    whiteSpace={'nowrap'}
                  >
                    {templateRepositoryName}
                  </Text>
                  {inPublicStore ? (
                    tags.findIndex((tag) => tag.name === 'official') !== -1 ? (
                      <MyTooltip
                        label={t('tags_enum.official')}
                        shouldWrapChildren={true}
                        placement="bottom"
                        offset={[0, 15]}
                      >
                        <MyIcon name="official" boxSize={'20px'} position={'relative'} />
                      </MyTooltip>
                    ) : (
                      <></>
                    )
                  ) : isPublic ? (
                    <Tag
                      size="sm"
                      bg="green.50"
                      color="green.600"
                      border="1px solid"
                      borderColor={'green.200'}
                      borderRadius="33px"
                      px="8px"
                      minW={'max-content'}
                      fontSize="10px"
                    >
                      {t('public')}
                    </Tag>
                  ) : (
                    <Tag
                      size="sm"
                      bg="adora.50"
                      color="adora.600"
                      border="1px solid"
                      borderColor={'adora.200'}
                      borderRadius="33px"
                      px="8px"
                      minW={'max-content'}
                      fontSize="10px"
                    >
                      {t('private')}
                    </Tag>
                  )}
                </Flex>
                <Flex width={'full'}>
                  <MyTooltip label={description} placement="bottom" offset={[0, 15]}>
                    <Text
                      fontSize="12px"
                      color="#667085"
                      letterSpacing="0.004em"
                      overflow={'hidden'}
                      // maxW={'150px'}
                      width={'0'}
                      flex={1}
                      textOverflow={'ellipsis'}
                      whiteSpace={'nowrap'}
                      h={'16px'}
                    >
                      {description}
                    </Text>
                  </MyTooltip>
                </Flex>
              </Flex>
            </Flex>

            {/* Buttons */}
            <Flex alignItems="center" gap="2px">
              <Button
                size="sm"
                bg="#0884DD"
                color="white"
                fontSize="12px"
                px="10px"
                h="28px"
                display={'none'}
                _groupHover={{
                  display: 'flex'
                }}
                onClick={() => {
                  setStartedTemplate({
                    uid: templateRepositoryUid,
                    name: templateRepositoryName,
                    iconId
                  });
                  closeTemplateModal();
                  router.push(`/devbox/create?templateRepository${templateRepositoryUid}`);
                }}
                isDisabled={isDisabled}
                _hover={{ bg: '#0773c4' }}
              >
                {t('start_devbox')}
              </Button>
              {!inPublicStore && (
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
                      onClick: editTemplateRepositoryHandle.onOpen
                    },
                    {
                      child: (
                        <>
                          <MyIcon name={'settings'} w={'16px'} fill={'currentcolor'} />
                          <Box ml={2}>{t('version_manage')}</Box>
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
                />
              )}
            </Flex>
          </Flex>
        </Box>
        {/* Tags */}
        <Flex gap="4px" wrap={'wrap'} minH={'22px'}>
          {tags
            .filter((tag) => tag.name !== 'official')
            .map((tag) => (
              <Tag
                px={'8px'}
                py={'4px'}
                key={tag.uid}
                bg="grayModern.150"
                color="brightBlue.600"
                borderRadius="33px"
                fontSize="10px"
              >
                {tag[lastLang === 'zh' ? 'zhName' : 'enName'] || tag.name}
              </Tag>
            ))}
        </Flex>
      </Box>
      <EditTemplateModal
        isOpen={editTemplateHandle.isOpen}
        templateRepositoryName={templateRepositoryName}
        onClose={editTemplateHandle.onClose}
        uid={templateRepositoryUid}
      />
      <EditTemplateRepositoryModal
        isOpen={editTemplateRepositoryHandle.isOpen}
        onClose={editTemplateRepositoryHandle.onClose}
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
