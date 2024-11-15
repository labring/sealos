import { createTemplateReposistory } from '@/api/template';
import MyFormLabel from '@/components/MyFormControl';
import { TemplateState } from '@/constants/template';
import { useTemplateStore } from '@/stores/template';
import { nameSchema, versionSchema } from '@/utils/vaildate';
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
  value: z.string(),
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
  const t = useTranslations()
  const formSchema = z.object({
    name: nameSchema.min(1, t('input_template_name_placeholder')),
    version: versionSchema,
    isPublic: z.boolean().default(false),
    agreeTerms: z.boolean().refine((val) => val === true, t('privacy_and_security_agreement_tips')),
    tags: z.array(tagSchema).min(1, t('select_at_least_1_tag')).max(3, t('select_lest_than_3_tags')),
    description: z.string(),
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
      description: '',
    },
    mode: 'onSubmit'
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = methods
  const { openTemplateModal, config } = useTemplateStore()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createTemplateReposistory
    // return await createTemplate(data)
  })
  const { message: toast } = useMessage()
  const onSubmitHandler: SubmitHandler<FormData> = async (_data) => {
    try {
      const result = formSchema.safeParse(_data)
      if (!result.success) {
        // const title = result.error.errors[0]
        
        const nameError = result.error.flatten().fieldErrors.name
        if(nameError && nameError.length > 0) {
          toast({
            title: t('invalide_template_name'),
            status: 'error',
          });
          return;
        }
        const title = result.error.errors[0].message
        toast({
          title,
          status: 'error',
        });
        return;
      }
      const data = result.data
      await mutation.mutateAsync({
        templateRepositoryName: data.name,
        version: data.version,
        isPublic: data.isPublic,
        description: data.description,
        tagUidList: data.tags.map((tag) => tag.value),
        devboxReleaseName
      });
      queryClient.invalidateQueries(['template-repository-list'])
      queryClient.invalidateQueries(['template-repository-detail'])
      reset();
      onClose();
      openTemplateModal({
        templateState: TemplateState.privateTemplate
      })
    } catch (error) {
      toast({
        title: t('submit_form_error'),
        status: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      onCloseComplete={() => reset()}
    >
      <ModalOverlay />
      <ModalContent maxW="562px">
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
                  <MyFormLabel width="108px" m='0' fontSize="14px" isRequired>{t('version')}</MyFormLabel>
                  <Controller
                    name="version"
                    control={control}
                    render={({ field,}) => (
                      <Input
                        {...field}
                        placeholder={t("input_template_version_placeholder")}
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
            <ModalFooter px={'52px'} pb={'32px'} >
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

export default CreateTemplateModal