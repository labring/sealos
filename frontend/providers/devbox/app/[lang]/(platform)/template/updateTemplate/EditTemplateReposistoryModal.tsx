import { getTemplateRepository, updateTemplateReposistory } from '@/api/template';
import { TemplateVersionState } from '@/constants/template';
import {
  Button,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FC, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import TemplateRepositoryDescriptionField from './components/TemplateRepositoryDescriptionField';
import TemplateRepositoryIsPublicField from './components/TemplateRepositoryIsPublicField';
import TemplateRepositoryNameField from './components/TemplateRepositoryNameField';
import TemplateRepositoryTagField from './components/TemplateRepositoryTagField';
const tagSchema = z.object({
  value: z.string().min(1)
});
const versionSchema = z.object({
  name: z.string(),
  uid: z.string(),
  state: z.nativeEnum(TemplateVersionState)
});
type VersionType = z.infer<typeof versionSchema>;
interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: FormData) => void;
  uid: string;
}

const EditTemplateRepositoryModal: FC<CreateTemplateModalProps> = ({ isOpen, onClose, uid }) => {
  const t = useTranslations();
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')),
    isPublic: z.boolean().default(false),
    agreeTerms: z.boolean().refine((val) => val === true, t('privacy_and_security_agreement_tips')),
    tags: z
      .array(tagSchema)
      .min(1, t('select_at_least_1_tag'))
      .max(3, t('select_lest_than_3_tags')),
    description: z.string()
  });
  type FormData = z.infer<typeof formSchema>;
  const methods = useForm<FormData>({
    defaultValues: {
      name: '',
      isPublic: false,
      agreeTerms: false,
      tags: [],
      description: ''
    }
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = methods;

  const DeleteTemplateVersionHandle = useDisclosure();
  const [deletedTemplateVersion, setDeletedTemplateVersion] = useState<VersionType | null>();
  const templateRepositoryQuery = useQuery(
    ['template-repository-detail', uid],
    () => getTemplateRepository(uid),
    {
      enabled: isOpen
    }
  );
  const updateMutation = useMutation(updateTemplateReposistory, {
    onSuccess() {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
    }
  });
  const templateRepository = templateRepositoryQuery.data?.templateRepository;
  const [publicIsDisabled, setPublicIsDisabled] = useState(false);
  useEffect(() => {
    if (isOpen && templateRepository && templateRepositoryQuery.isSuccess) {
      setValue(
        'tags',
        templateRepository.templateRepositoryTags.map(({ tag }) => ({
          value: tag.uid
        }))
      );

      setValue('name', templateRepository.name);
      setValue('description', templateRepository.description || '');
      setValue('isPublic', templateRepository.isPublic);
      if (templateRepository.isPublic) {
        setPublicIsDisabled(true);
        setValue('agreeTerms', true);
      }
    }
  }, [templateRepository, isOpen]);
  const { message: toast } = useMessage();
  const queryClient = useQueryClient();
  const onSubmitHandler = async (_data: FormData) => {
    try {
      const result = formSchema.safeParse(_data);
      if (!result.success) {
        const error = result.error.errors[0];
        toast({
          title: error.message,
          status: 'error'
        });
        return;
      }
      const data = result.data;
      await updateMutation.mutateAsync({
        uid,
        templateRepositoryName: data.name,
        isPublic: data.isPublic,
        description: data.description,
        tagUidList: data.tags.map(({ value }) => value)
      });
      queryClient.invalidateQueries(['template-repository-list']);
      reset();
      onClose();
      toast({
        title: t('template_ssaved_successfully'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: error as string,
        status: 'error'
      });
    }
  };
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md" onCloseComplete={() => reset()}>
        <ModalOverlay />
        <ModalContent maxW="562px" margin={'auto'}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmitHandler)}>
              <ModalHeader>
                <Text>{t('edit_template')}</Text>
              </ModalHeader>
              <ModalBody pt={'32px'} pb={'24px'} px={'52px'}>
                <ModalCloseButton />

                <VStack spacing={6} align="stretch">
                  {/* 名称 */}
                  <TemplateRepositoryNameField isDisabled />

                  {/* 公开 */}
                  <TemplateRepositoryIsPublicField isDisabled={publicIsDisabled} />

                  {/* 标签 */}
                  <TemplateRepositoryTagField />

                  {/* 简介 */}
                  <TemplateRepositoryDescriptionField />
                </VStack>
              </ModalBody>
              <ModalFooter px={'52px'} pb={'32px'}>
                {/* 按钮组 */}
                <ButtonGroup variant={'outline'}>
                  <Button
                    px={'29.5px'}
                    py={'8px'}
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    px={'29.5px'}
                    py={'8px'}
                    variant={'solid'}
                    // _hover={{ bg: 'grayModern.800' }}
                    isLoading={isSubmitting}
                  >
                    {t('save_template')}
                  </Button>
                </ButtonGroup>
              </ModalFooter>
            </form>
          </FormProvider>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EditTemplateRepositoryModal;
