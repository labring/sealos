import { updateTemplate } from '@/api/template';
import MyIcon from '@/components/Icon';
import MyFormLabel from '@/components/MyFormControl';
import { versionSchema } from '@/utils/vaildate';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { AddIcon, useMessage } from '@sealos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FC, useEffect, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import OverviewTemplateVersionModal from '../updateTemplateVersion/OverviewTemplateVersionModal';
import TemplateRepositoryDescriptionField from './components/TemplateRepositoryDescriptionField';
import TemplateRepositoryNameField from './components/TemplateRepositoryNameField';
import TemplateRepositoryTagField from './components/TemplateRepositoryTagField';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  devboxReleaseName: string;
  templateRepository: {
    uid: string;
    name: string;
    description: string | null;
    iconId: string | null;
    isPublic: boolean;
    templates: {
      uid: string;
      name: string;
    }[];
    templateRepositoryTags: {
      tag: {
        uid: string;
        name: string;
      };
    }[];
  };
}

const VersionSelect = ({ templateList }: { templateList: { uid: string; name: string }[] }) => {
  const { watch, setValue } = useFormContext<any>();
  const [inputValue, setInputValue] = useState('');

  const handleVersionSelect = (version: string) => {
    setInputValue(version);
    setValue('version', inputValue);
    handler.onClose();
  };
  const handler = useDisclosure();

  const handleCreateVersion = () => {
    // 处理创建新版本的逻辑
    setValue('version', inputValue);
    handler.onClose();
  };
  const t = useTranslations();
  return (
    <>
      <Popover
        placement="bottom-start"
        isOpen={handler.isOpen}
        onOpen={handler.onOpen}
        onClose={handler.onClose}
      >
        <PopoverTrigger>
          <Flex
            width={'350px'}
            bgColor={'grayModern.50'}
            border={'1px solid'}
            borderColor={'grayModern.200'}
            borderRadius={'6px'}
            py={'8px'}
            px={'12px'}
            justify={'space-between'}
          >
            <Text fontSize={'12px'} width={400}>
              {watch('version')}
            </Text>
            <MyIcon name="chevronDown" boxSize={'16px'} color={'grayModern.500'} />
          </Flex>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverBody
            p="6px"
            width="280px"
            boxShadow="box-shadow: 0px 0px 1px 0px #13336B1A,box-shadow: 0px 4px 10px 0px #13336B1A"
            border="none"
            borderRadius="6px"
          >
            <Input
              width="full"
              height="32px"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              // border="1px solid #219BF4"
              // boxShadow="0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)"
              borderRadius="4px"
              fontSize="12px"
              placeholder={t('search_or_add_version')}
              _focus={{
                border: '1px solid #219BF4',
                boxShadow: '0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)'
              }}
            />
            <VStack spacing="0" align="stretch" mt={'4px'}>
              {/* 已有版本列表 */}
              {templateList
                .filter((v) => v.name.toLowerCase().includes(inputValue.toLowerCase()))
                .map((v) => (
                  <Box
                    key={v.uid}
                    p="8px 12px"
                    borderRadius={'4px'}
                    fontSize="12px"
                    cursor="pointer"
                    _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                    onClick={() => handleVersionSelect(v.name)}
                  >
                    {v.name}
                  </Box>
                ))}

              {/* 创建新版本选项 */}
              {inputValue && !templateList.find((v) => v.name === inputValue) && (
                <HStack
                  p="8px 12px"
                  spacing="8px"
                  cursor="pointer"
                  _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                  onClick={handleCreateVersion}
                >
                  <AddIcon w="16px" h="16px" color="#667085" />
                  <Text fontSize="12px" lineHeight="16px" letterSpacing="0.004em" color="#111824">
                    {t('create_template_version', {
                      version: inputValue
                    })}
                  </Text>
                </HStack>
              )}
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </>
  );
};
const UpdateTemplateRepositoryModal: FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  templateRepository,
  devboxReleaseName
}) => {
  const t = useTranslations();
  const tagSchema = z.object({
    value: z.string()
  });
  const formSchema = z.object({
    name: z.string().min(1, t('input_template_name_placeholder')),
    version: z.string().min(1, t('input_template_version_placeholder')).pipe(versionSchema),
    tags: z
      .array(tagSchema)
      .min(1, t('select_at_least_1_tag'))
      .max(3, t('select_lest_than_3_tags')),
    description: z.string()
  });
  const queryClient = useQueryClient();
  type FormData = z.infer<typeof formSchema>;
  const mutation = useMutation(updateTemplate, {
    onSuccess() {
      queryClient.invalidateQueries(['template-repository-list']);
      queryClient.invalidateQueries(['template-repository-detail']);
    }
  });
  const methods = useForm<FormData>({
    defaultValues: {
      name: '',
      version: '',
      // agreeTerms: false,
      tags: [],
      description: ''
    }
  });
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = methods;
  useEffect(() => {
    if (templateRepository && isOpen) {
      setValue(
        'tags',
        templateRepository.templateRepositoryTags.map(({ tag }) => ({
          value: tag.uid
        }))
      );
      setValue('version', templateRepository.templates[0]?.name || '');
      setValue('name', templateRepository.name);
      setValue('description', templateRepository.description || '');
    }
  }, [templateRepository, isOpen]);
  const { message: toast } = useMessage();
  const overviewHandler = useDisclosure();
  const submit = async (_data: FormData) => {
    try {
      const result = formSchema.safeParse(_data);
      if (!result.success) {
        const error = result.error.errors[0];
        if (error.path[0] === 'version' && error.code === 'invalid_string') {
          toast({
            title: t('invalide_template_version'),
            status: 'error'
          });
          return;
        }
        toast({
          title: error.message,
          status: 'error'
        });
        return;
      }
      const data = result.data;
      await mutation.mutateAsync({
        templateRepositoryUid: templateRepository?.uid || '',
        version: data.version,
        devboxReleaseName,
        description: data.description,
        tagUidList: data.tags.map(({ value }) => value)
      });

      queryClient.invalidateQueries(['template-repository-list']);
      reset();
      onClose();
      toast({
        title: t('update_template_success'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: error as string,
        status: 'error'
      });
    }
  };
  const onSubmitHandler = (data: FormData) => {
    if (templateRepository.templates.findIndex((d) => data.version === d.name) > -1) {
      overviewHandler.onOpen();
      return;
    }
    return submit(data);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md" onCloseComplete={() => reset()}>
        <ModalOverlay />
        <ModalContent maxW="562px" margin={'auto'}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmitHandler)}>
              <ModalHeader>
                <Text>{t('update_template')}</Text>
              </ModalHeader>
              <ModalBody pt={'32px'} pb={'24px'} px={'52px'}>
                <ModalCloseButton />
                <VStack spacing={6} align="stretch">
                  {/* 名称 */}
                  <TemplateRepositoryNameField isDisabled />

                  {/* 版本号 */}
                  <Flex justify={'space-between'} align={'center'}>
                    <MyFormLabel width="108px" m="0" fontSize="14px" isRequired>
                      {t('version')}
                    </MyFormLabel>
                    <VStack>
                      <VersionSelect templateList={templateRepository.templates} />
                    </VStack>
                  </Flex>

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
      <OverviewTemplateVersionModal
        isOpen={overviewHandler.isOpen}
        onClose={overviewHandler.onClose}
        onSubmit={() => {
          submit(methods.getValues());
        }}
        version={watch('version')}
        template={templateRepository.name}
      />
    </>
  );
};

export default UpdateTemplateRepositoryModal;
