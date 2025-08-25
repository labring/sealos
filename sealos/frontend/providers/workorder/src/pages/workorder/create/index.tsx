import { createWorkOrder, updateWorkOrderDialogById } from '@/api/workorder';
import FileSelect, { FileItemType } from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import { OrderTypeList } from '@/constants/workorder';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { WorkOrderEditForm, WorkOrderType } from '@/types/workorder';
import { serviceSideProps } from '@/utils/i18n';
import { Box, BoxProps, Flex, Icon, Text, Textarea } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import ErrorModal from './components/ErrorModal';
import Header from './components/Header';
import { FeishuNotification, uploadFile } from '@/api/platform';

export default function EditOrder() {
  const [errorMessage, setErrorMessage] = useState('');
  const [files, setFiles] = useState<FileItemType[]>([]);
  const { t } = useTranslation();
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const router = useRouter();
  const { screenWidth, lastRoute } = useGlobalStore();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [fileProgressText, setFileProgressText] = useState('');

  const { openConfirm, ConfirmChild } = useConfirm({
    content: t('Are you sure you want to submit this work order')
  });

  // form
  const formHook = useForm<WorkOrderEditForm>({
    defaultValues: {
      type: WorkOrderType.AppLaunchpad,
      description: ''
    }
  });

  // watch form change, compute new yaml
  formHook.watch((data) => {
    setForceUpdate(!forceUpdate);
  });

  const submitSuccess = async (data: WorkOrderEditForm) => {
    setIsLoading(true);
    try {
      const form = new FormData();
      files.forEach((item) => {
        form.append('file', item.file, encodeURIComponent(item.filename));
      });
      form.append('overwrite', 'false');
      const result = await uploadFile(form);
      const res = await createWorkOrder({
        type: data.type,
        description: data.description,
        appendix: result.map((i) => i.fileName)
      });
      await updateWorkOrderDialogById({
        orderId: res.orderId,
        content: data.description
      });
      await FeishuNotification({
        type: data.type,
        description: data.description,
        orderId: res.orderId
      });
      toast({
        status: 'success',
        title: 'success'
      });
      router.push(`/workorder/detail?orderId=${res.orderId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(JSON.stringify(error));
    }
    setIsLoading(false);
  };

  const submitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj) return t('Submit Error');
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };

    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    });
  }, [formHook.formState.errors, t, toast]);

  const Label = ({
    children,
    w = 'auto',
    LabelStyle
  }: {
    children: string;
    w?: number | 'auto';
    LabelStyle?: BoxProps;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      {...LabelStyle}
      color={'#333'}
      userSelect={'none'}
    >
      {children}
    </Box>
  );

  return (
    <Box
      flexDirection={'column'}
      alignItems={'center'}
      width={'100vw'}
      height={'100%'}
      minW={'910px'}
      bg={'#F3F4F5'}
    >
      <Header
        title="New Order"
        applyCb={() =>
          formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
        }
        applyBtnText="Submit Order"
      />
      <Flex h={'calc(100% - 126px)'} justifyContent={'center'} borderRadius={'4px'}>
        <Flex
          height={'100%'}
          bg="#FFF"
          minW={'782px'}
          borderRadius={'4px'}
          border={'1px solid #DEE0E2'}
          flexDirection={'column'}
        >
          <Flex alignItems={'center'} py="16px" px="42px" bg={'#F4F6F8'}>
            <MyIcon name="formInfo" w={'24px'}></MyIcon>
            <Text ml="12px" fontSize={'18px'} fontWeight={500} color={'#24282C'}>
              {t('Problem Description')}
            </Text>
          </Flex>
          <Box pt="24px" pl="42px" pb="64px" flex={1} h="0" overflow={'auto'}>
            <Flex alignItems={'center'} mt={'16px'}>
              <Label w={80}>{t('Type')}</Label>
              <MySelect
                width={'300px'}
                value={formHook.getValues('type')}
                list={OrderTypeList}
                onchange={(val: any) => {
                  formHook.setValue('type', val);
                }}
              />
            </Flex>
            <Flex alignItems={'center'} mt={'16px'}>
              <Label
                w={80}
                LabelStyle={{
                  alignSelf: 'start'
                }}
              >
                {t('appendix')}
              </Label>
              <FileSelect
                w="300px"
                h="96px"
                fileExtension={'*'}
                files={files}
                setFiles={setFiles}
              />
            </Flex>
            <Flex alignItems={'center'} mt={'50px'}>
              <Label
                w={80}
                LabelStyle={{
                  alignSelf: 'start'
                }}
              >
                {t('Description')}
              </Label>
              <Textarea
                w="415px"
                minH={'133px'}
                placeholder={t('describe your problem') || ''}
                {...formHook.register('description')}
              />
            </Flex>
          </Box>
        </Flex>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={'Failed'} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </Box>
  );
}

export async function getServerSideProps(context: any) {
  return {
    props: { ...(await serviceSideProps(context)) }
  };
}
