import { listTemplate } from '@/api/template';
import MyIcon from '@/components/Icon';
import MyTable from '@/components/MyTable';
import {
  Box,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { FC, useState } from 'react';
import { z } from 'zod';
import DeleteTemplateVersionModal from '../updateTemplateVersion/DeleteTemplateVersionModal';
const tagSchema = z.object({
  value: z.string().min(1)
});
const versionSchema = z.object({
  name: z.string(),
  uid: z.string()
});
type VersionType = z.infer<typeof versionSchema>;
interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: FormData) => void;
  uid: string;
  templateRepositoryName: string;
}

const EditTemplateModal: FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  uid,
  templateRepositoryName
}) => {
  const t = useTranslations();
  const DeleteTemplateVersionHandle = useDisclosure();
  const [deletedTemplateVersion, setDeletedTemplateVersion] = useState<VersionType | null>();
  const templateRepositoryQuery = useQuery(['templateList', uid], () => listTemplate(uid), {
    enabled: isOpen
  });
  const columns: {
    title: string;
    dataIndex?: keyof {
      uid: string;
      name: string;
      config: string;
      image: string;
      createAt: Date;
      updateAt: Date;
    };
    minWidth?: string;
    key: string;
    render?: (item: {
      uid: string;
      name: string;
      config: string;
      image: string;
      createdAt: Date;
      updatedAt: Date;
    }) => JSX.Element;
  }[] = [
    {
      title: t('version'),
      key: 'name',
      render: (item) => {
        return (
          <Flex alignItems={'center'} ml={'14.5px'}>
            <Text
              color={'grayModern.900'}
              maxW={'100px'}
              textOverflow={'ellipsis'}
              whiteSpace={'nowrap'}
            >
              {item.name}
            </Text>
          </Flex>
        );
      }
    },
    {
      title: t('creation_time'),
      dataIndex: 'createAt',
      key: 'createAt',
      render: (item) => {
        return (
          <Text color={'grayModern.600'}>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
        );
      }
    },
    {
      title: t('update_time'),
      dataIndex: 'updateAt',
      key: 'updateAt',
      render: (item) => {
        return (
          <Text color={'grayModern.600'}>{dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm')}</Text>
        );
      }
    },
    {
      title: t('control'),
      key: 'control',
      minWidth: 'unset',
      render: (item) => (
        // <Flex>
        <IconButton
          aria-label="delete"
          size={'sm'}
          variant={'square'}
          boxSize={'24px'}
          color={'grayModern.500'}
          _hover={{
            color: 'red.600',
            bg: 'grayModern.150'
          }}
          icon={<MyIcon name="delete" boxSize={'16px'} />}
          minW={'unset'}
          onClick={() => {
            setDeletedTemplateVersion({
              name: item.name,
              uid: item.uid
            });
            DeleteTemplateVersionHandle.onOpen();
          }}
        />
        // </Flex>
      )
    }
  ];
  const templateList = templateRepositoryQuery.data?.templateList || [];
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent maxW="658px" margin={'auto'} minH={'476px'} maxH={'90vh'}>
          <ModalHeader>
            <Text>{t('version_manage')}</Text>
          </ModalHeader>
          <ModalBody py={'32px'} px={'56px'}>
            <ModalCloseButton />
            <Flex flexDirection={'column'} h={'full'}>
              <Flex h={'364px'} flex={'auto'} overflow={'auto'} flexDirection={'column'}>
                <MyTable
                  needRadius
                  columns={columns}
                  data={templateList}
                  gridTemplateColumns={'120px 180px 180px auto'}
                />
                {templateList.length === 0 && (
                  <Flex
                    justifyContent={'center'}
                    flex={1}
                    alignItems={'center'}
                    mt={10}
                    flexDirection={'column'}
                    gap={4}
                  >
                    <MyIcon name="empty" w={'40px'} h={'40px'} color={'white'} />
                    <Box textAlign={'center'} color={'grayModern.600'}>
                      {t('no_template_versions')}
                    </Box>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
      {!!deletedTemplateVersion && (
        <DeleteTemplateVersionModal
          isLasted={templateList.length <= 1}
          version={deletedTemplateVersion.name}
          template={templateRepositoryName}
          isOpen={DeleteTemplateVersionHandle.isOpen}
          onClose={DeleteTemplateVersionHandle.onClose}
          uid={deletedTemplateVersion.uid}
        />
      )}
    </>
  );
};

export default EditTemplateModal;
