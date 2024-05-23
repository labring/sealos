import { postDeployApp } from '@/api/app';
import { getInstanceByName } from '@/api/instance';
import { templateDisplayNameKey } from '@/constants/keys';
import { useToast } from '@/hooks/useToast';
import { useResourceStore } from '@/store/resource';
import { ApplicationType, TemplateInstanceType } from '@/types/app';
import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Input,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import JSYAML from 'js-yaml';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
import DelModal from './delDodal';
import { useSearchStore } from '@/store/search';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';

export default function Header({ instanceName }: { instanceName: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { appendResource } = useResourceStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isOpenDelModal,
    onOpen: onOpenDelModal,
    onClose: onCloseDelModal
  } = useDisclosure();
  const [displayName, setDisplayName] = useState('');
  const yamlCR = useRef<TemplateInstanceType>();
  const { setAppType } = useSearchStore();
  const { session } = useSessionStore();

  const { data, refetch } = useQuery(
    ['getInstanceByName', instanceName, session?.kubeconfig],
    () => getInstanceByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        yamlCR.current = data.yamlCR;
        setDisplayName(data?.displayName || instanceName);
        appendResource([{ id: data.id, name: data.id, kind: 'Instance' }]);
      }
    }
  );

  const handleDisplayName = async () => {
    try {
      if (yamlCR.current) {
        yamlCR.current.metadata.labels = yamlCR.current.metadata.labels ?? {};
        if (displayName) {
          yamlCR.current.metadata.labels[templateDisplayNameKey] = displayName;
        }
        const yaml = JSYAML.dump(yamlCR.current);
        await postDeployApp([yaml], 'replace');
        refetch();
        toast({
          status: 'success',
          title: 'success'
        });
      }
    } catch (error) {
      if (typeof error === 'string') {
        toast({
          status: 'error',
          title: error
        });
      }
    }
    onClose();
  };

  return (
    <Flex
      pt="24px"
      pb="20px"
      pl="24px"
      pr="36px"
      alignItems={'center'}
      borderBottom={'1px solid rgba(0, 0, 0, 0.07)'}
    >
      <Icon
        cursor={'pointer'}
        width="35px"
        height="36px"
        viewBox="0 0 35 36"
        fill="#5A646E"
        onClick={() => {
          setAppType(ApplicationType.MyApp);
          router.push('/app');
        }}
      >
        <path d="M20.3207 27L11.6118 18L20.3207 9L22.3527 11.1L15.676 18L22.3527 24.9L20.3207 27Z" />
      </Icon>
      <Box
        ml="10px"
        p={'6px'}
        w={'44px'}
        h={'44px'}
        boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
        borderRadius={'4px'}
        backgroundColor={'#fff'}
        border={' 1px solid rgba(255, 255, 255, 0.50)'}
      >
        <Image src={data?.icon} alt="" width={'32px'} height={'32px'} />
      </Box>

      <Box ml="16px">
        <Flex alignItems={'center'}>
          <Text fontWeight={600} fontSize={'18px'}>
            {data?.displayName ? data?.displayName : data?.id}
          </Text>
          <Flex alignItems={'center'} gap={'4px'} ml="12px" cursor={'pointer'} onClick={onOpen}>
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="15px"
              height="15px"
              viewBox="0 0 15 15"
              fill="none"
            >
              <path
                d="M11.0198 3.07493L12.1747 4.22987L12.9681 3.4365C13.1145 3.29012 13.1877 3.21692 13.2292 3.13931C13.3229 2.9642 13.3229 2.75386 13.2292 2.57875C13.1877 2.50114 13.1145 2.42795 12.9681 2.28157C12.8217 2.13519 12.7485 2.06198 12.6709 2.02046C12.4958 1.92677 12.2855 1.92677 12.1103 2.02046C12.0327 2.06198 11.9595 2.13517 11.8132 2.28156L11.0198 3.07493Z"
                fill="#485264"
              />
              <path
                d="M6.63497 9.63343C6.59667 9.63591 6.5493 9.63591 6.48808 9.63591H5.99355C5.85821 9.63591 5.79054 9.63591 5.73903 9.60916C5.69562 9.58661 5.66023 9.55122 5.63768 9.50781C5.61092 9.4563 5.61092 9.38863 5.61092 9.25328V8.75404C5.61092 8.61869 5.61092 8.55102 5.63768 8.49951C5.64059 8.49391 5.64371 8.48844 5.64704 8.48312C5.68126 8.41346 5.75152 8.3432 5.87422 8.2205L10.2636 3.83116L11.4185 4.9861L7.02916 9.37544C6.8856 9.519 6.81382 9.59078 6.73081 9.61703C6.69958 9.62691 6.66733 9.63238 6.63497 9.63343Z"
                fill="#485264"
              />
              <path
                d="M5.40012 2.20729C4.85655 2.20728 4.41272 2.20728 4.05237 2.2372C3.67954 2.26817 3.34413 2.33415 3.03206 2.49626C2.56328 2.73978 2.18105 3.12201 1.93753 3.59079C1.77542 3.90286 1.70944 4.23827 1.67847 4.6111C1.64855 4.97146 1.64855 5.41528 1.64856 5.95885V9.59657C1.64855 10.1401 1.64855 10.584 1.67847 10.9443C1.70944 11.3172 1.77542 11.6526 1.93753 11.9647C2.18105 12.4334 2.56328 12.8157 3.03206 13.0592C3.34413 13.2213 3.67954 13.2873 4.05237 13.3182C4.41273 13.3482 4.85657 13.3482 5.40016 13.3482H9.03782C9.58141 13.3482 10.0252 13.3482 10.3856 13.3182C10.7584 13.2873 11.0938 13.2213 11.4059 13.0592C11.8747 12.8157 12.2569 12.4334 12.5004 11.9647C12.6626 11.6526 12.7285 11.3172 12.7595 10.9443C12.7894 10.584 12.7894 10.1402 12.7894 9.59659V7.24116C12.7894 6.91899 12.5283 6.65783 12.2061 6.65783C11.8839 6.65783 11.6228 6.91899 11.6228 7.24116V9.5717C11.6228 10.1462 11.6223 10.5414 11.5968 10.8478C11.572 11.1472 11.5263 11.3091 11.4651 11.4268C11.3323 11.6825 11.1238 11.891 10.8681 12.0239C10.7503 12.0851 10.5884 12.1307 10.2891 12.1556C9.98269 12.181 9.58746 12.1815 9.01292 12.1815H5.42506C4.85052 12.1815 4.45529 12.181 4.14893 12.1556C3.84955 12.1307 3.68765 12.0851 3.56986 12.0239C3.31416 11.891 3.10567 11.6825 2.97285 11.4268C2.91166 11.3091 2.866 11.1472 2.84114 10.8478C2.8157 10.5414 2.81523 10.1462 2.81523 9.57165V5.98379C2.81523 5.40925 2.8157 5.01402 2.84114 4.70766C2.866 4.40828 2.91166 4.24638 2.97285 4.12859C3.10567 3.87289 3.31416 3.6644 3.56986 3.53158C3.68765 3.47039 3.84955 3.42473 4.14892 3.39987C4.45528 3.37443 4.85051 3.37396 5.42503 3.37396H7.77986C8.10203 3.37396 8.3632 3.11279 8.3632 2.79062C8.3632 2.46846 8.10203 2.20729 7.77986 2.20729L5.40012 2.20729Z"
                fill="#485264"
              />
            </Icon>
            <Text fontSize={'12px'} fontWeight={500} color={'#485264'}>
              {t('Edit')}
            </Text>
          </Flex>
        </Flex>
        <Text fontSize={'12px'} color={'#667085'}>
          {data?.id}
        </Text>
      </Box>

      <Flex
        ml="auto"
        w="156px"
        h="42px"
        justifyContent={'center'}
        alignItems={'center'}
        cursor={'pointer'}
        background={'#FFF'}
        borderRadius={'4px'}
        border={'1px solid #DEE0E2'}
        onClick={onOpenDelModal}
      >
        <Icon width="16px" height="17px" viewBox="0 0 16 17" fill="#121416">
          <path d="M4.66667 14.5C4.30001 14.5 3.98601 14.3693 3.72467 14.108C3.46334 13.8467 3.33289 13.5329 3.33334 13.1667V4.5H2.66667V3.16667H6.00001V2.5H10V3.16667H13.3333V4.5H12.6667V13.1667C12.6667 13.5333 12.536 13.8473 12.2747 14.1087C12.0133 14.37 11.6996 14.5004 11.3333 14.5H4.66667ZM11.3333 4.5H4.66667V13.1667H11.3333V4.5ZM6.00001 11.8333H7.33334V5.83333H6.00001V11.8333ZM8.66667 11.8333H10V5.83333H8.66667V11.8333Z" />
        </Icon>
        <Text pl="8px " color={'#24282C'} fontWeight={600}>
          {t('Unload')}
        </Text>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('Edit App Name')}</ModalHeader>
          <ModalCloseButton />
          <Flex flexDirection={'column'} p="24px 36px">
            <Text fontSize={'14px'} fontWeight={500} color={'#24282C'}>
              {t('App Name')}
            </Text>
            <Input mt="8px" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Button mt="24px" alignSelf={'end'} variant={'primary'} onClick={handleDisplayName}>
              {t('Confirm')}
            </Button>
          </Flex>
        </ModalContent>
      </Modal>
      {isOpenDelModal && (
        <DelModal
          name={instanceName}
          onClose={onCloseDelModal}
          onSuccess={() => router.replace('/app')}
        />
      )}
    </Flex>
  );
}
