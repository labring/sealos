import { useDevboxStore } from '@/stores/devbox';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { Center, Img, Text } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

export default function TemplateRepositoryItem({
  item,
  isEdit
}: {
  item: { uid: string; iconId: string; name: string };
  isEdit: boolean;
}) {
  const { message: toast } = useMessage();
  const t = useTranslations();
  const { getValues, setValue, watch } = useFormContext<DevboxEditTypeV2>();
  const { startedTemplate, setStartedTemplate } = useDevboxStore();
  return (
    <Center
      key={item.uid}
      flexDirection={'column'}
      w={'110px'}
      height={'80px'}
      border={'1px solid'}
      borderRadius={'6px'}
      cursor={'pointer'}
      fontWeight={'bold'}
      color={'grayModern.900'}
      opacity={isEdit ? 0.5 : 1}
      {...(watch('templateRepositoryUid') === item.uid
        ? {
            bg: '#F9FDFE',
            borderColor: 'brightBlue.500',
            boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
          }
        : {
            bg: '#F7F8FA',
            borderColor: 'grayModern.200',
            _hover: {
              borderColor: '#85ccff'
            }
          })}
      onClick={() => {
        if (isEdit) return;
        const devboxName = getValues('name');
        if (!devboxName) {
          toast({
            title: t('Please enter the devbox name first'),
            status: 'warning'
          });
          return;
        }
        setValue('gpu.type', '');
        if (startedTemplate && startedTemplate.uid !== item.uid) {
          setStartedTemplate(undefined);
        }
        setValue('templateRepositoryUid', item.uid);
      }}
    >
      <Img
        width={'32px'}
        height={'32px'}
        alt={item.uid}
        src={`/images/${item.iconId || 'custom'}.svg`}
      />
      <Text mt={'4px'} textAlign={'center'} noOfLines={1} width={'90px'}>
        {item.name}
      </Text>
    </Center>
  );
}
