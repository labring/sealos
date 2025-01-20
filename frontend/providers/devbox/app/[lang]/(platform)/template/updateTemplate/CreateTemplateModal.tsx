import { createTemplateReposistory } from '@/api/template';
import MyFormLabel from '@/components/MyFormControl';
import { TemplateState } from '@/constants/template';
import { usePathname } from '@/i18n';
import { useTemplateStore } from '@/stores/template';
import { templateNameSchema, versionSchema } from '@/utils/vaildate';
import {
  Button,
  ButtonGroup,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FC } from 'react';
import { Controller, FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import TemplateRepositoryDescriptionField from './components/TemplateRepositoryDescriptionField';
import TemplateRepositoryIsPublicField from './components/TemplateRepositoryIsPublicField';
import TemplateRepositoryNameField from './components/TemplateRepositoryNameField';
import TemplateRepositoryTagField from './components/TemplateRepositoryTagField';
const tagSchema = z.object({
  value: z.string()
});

// 定义表单数据类型和验证规则

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  devboxReleaseName: string;
  // onSubmit?: (data: FormData) => void;
}
const CreateTemplateModal: FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  // onSubmit
  devboxReleaseName
}) => {
  const t = useTranslations();
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')).pipe(templateNameSchema),
    version: z.string().min(1, t('input_template_version_placeholder')).pipe(versionSchema),
    isPublic: z.boolean().default(false),
    agreeTerms: z.boolean().refine((val) => val === true, t('privacy_and_security_agreement_tips')),
    tags: z
      .array(tagSchema)
      .min(1, t('select_at_least_1_tag'))
      .max(3, t('select_lest_than_3_tags')),
    description: z.string()
  });

  type FormData = z.infer<typeof formSchema>;
  type Tag = z.infer<typeof tagSchema>;
  const methods = useForm<FormData>({
    defaultValues: {
      name: '',
      version: '',
      isPublic: false,
      agreeTerms: false,
      tags: [],
      description: ''
    },
    mode: 'onSubmit'
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = methods;
  const { openTemplateModal, config } = useTemplateStore();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createTemplateReposistory
    // return await createTemplate(data)
  });
  const { message: toast } = useMessage();
  const lastRoute = usePathname();
  const onSubmitHandler: SubmitHandler<FormData> = async (_data) => {
    try {
      const result = formSchema.safeParse(_data);
      if (!result.success) {
        // const title = result.error.errors[0]
        const error = result.error.errors[0];
        if (error.path[0] === 'name' && error.code === 'invalid_string') {
          toast({
            title: t('invalide_template_name'),
            status: 'error'
          });
          return;
        }
        if (error.path[0] === 'version' && error.code === 'invalid_string') {
          toast({
            title: t('invalide_template_version'),
            status: 'error'
          });
          return;
        }
        const title = error.message;
        toast({
          title,
          status: 'error'
        });
        return;
      }
      const data = result.data;
      await mutation.mutateAsync({
        templateRepositoryName: data.name,
        version: data.version,
        isPublic: data.isPublic,
        description: data.description,
        tagUidList: data.tags.map((tag) => tag.value),
        devboxReleaseName
      });
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
      reset();
      onClose();
      openTemplateModal({
        templateState: TemplateState.privateTemplate,
        lastRoute
      });
      toast({
        title: t('create_template_success'),
        status: 'success'
      });
    } catch (error) {
      if (error == '409:templateRepository name already exists') {
        return toast({
          title: t('template_repository_name_already_exists'),
          status: 'error'
        });
      }
      toast({
        title: error as string,
        status: 'error'
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" onCloseComplete={() => reset()}>
      <ModalOverlay />
      <ModalContent maxW="562px" margin={'auto'}>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmitHandler)}>
            <ModalHeader>
              <Text>{t('create_template')}</Text>
            </ModalHeader>
            <ModalBody pt={'32px'} pb={'24px'} px={'52px'}>
              <ModalCloseButton />
              <VStack spacing={6} align="stretch">
                {/* 名称 */}
                <TemplateRepositoryNameField />

                {/* 版本号 */}

                <Flex align={'center'}>
                  <MyFormLabel width="108px" m="0" fontSize="14px" isRequired>
                    {t('version')}
                  </MyFormLabel>
                  <Controller
                    name="version"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={t('input_template_version_placeholder')}
                        bg="grayModern.50"
                        borderColor="grayModern.200"
                        size="sm"
                        width={'350px'}
                      />
                    )}
                  />
                </Flex>

                {/* 公开 */}
                {/* <Flex > */}
                <TemplateRepositoryIsPublicField />

                {/* 标签 */}
                <TemplateRepositoryTagField />

                {/* 简介 */}
                <TemplateRepositoryDescriptionField />
              </VStack>
            </ModalBody>
            <ModalFooter px={'52px'} pb={'32px'}>
              {/* 按钮组 */}
              <ButtonGroup spacing={'10px'}>
                <Button
                  variant="outline"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  px={'29.5px'}
                  py={'8px'}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant={'solid'}
                  px={'29.5px'}
                  py={'8px'}
                  isLoading={isSubmitting}
                >
                  {t('create')}
                </Button>
              </ButtonGroup>
            </ModalFooter>
          </form>
        </FormProvider>
      </ModalContent>
    </Modal>
  );
};

export default CreateTemplateModal;
