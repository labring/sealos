import {
  Text,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  ButtonProps,
  SimpleGrid,
  Box,
  IconButton,
  HStack,
  Spinner,
  VStack,
  Grid,
  GridItem
} from '@chakra-ui/react';
import ListIcon from '@/components/Icons/ListIcon';
import { initUser } from '@/api/bucket';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { QueryKey } from '@/consts';
import { useCopyData } from '@/utils/tools';
import CopyIcon from '@/components/Icons/CopyIcon';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import UpdateSecretKeyModal from '../UpdateSecretKeyModal';
import useSessionStore from '@/store/session';
import { useOssStore } from '@/store/ossStore';
export default function ParamterModal({ ...styles }: ButtonProps) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const { copyData } = useCopyData();
  const { t } = useTranslation();
  const { session } = useSessionStore();
  const { secret, setSecret, setIsUpdating } = useOssStore();
  // const {isUpdating}

  const miniouser = useQuery([QueryKey.bucketUser, { session }], initUser, {
    refetchInterval(data, query) {
      const newSecret = data?.secret;
      const needRefresh = !newSecret || newSecret.specVersion > newSecret.version;
      if (needRefresh) {
        return 3000;
      } else {
        return false;
      }
    }
  });

  useEffect(() => {
    if (miniouser.isSuccess) {
      const newSecret = miniouser.data.secret;
      if (newSecret.specVersion <= newSecret.version) {
        setIsUpdating(false);
        setSecret(newSecret);
      } else {
        setIsUpdating(true);
      }
    } else {
      setIsUpdating(true);
    }
  }, [miniouser.data]);

  const accessKey = secret?.CONSOLE_ACCESS_KEY || '';
  const secretKey = secret?.CONSOLE_SECRET_KEY || '';
  const internal = secret?.internal || '';
  const external = secret?.external || '';
  const itemList: { key: string; value: string }[] = useMemo(
    () => [
      { key: 'Access Key', value: accessKey },
      { key: 'Secret Key', value: secretKey },
      { key: 'Internal', value: internal },
      { key: 'External', value: external }
    ],
    [secret]
  );
  return (
    <>
      <Button
        onClick={onOpen}
        gap={'8px'}
        variant={'secondary'}
        bgColor="grayModern.150"
        borderColor={'grayModern.250'}
        color={'grayModern.600'}
        fontWeight={500}
        fontSize={'12px'}
        {...styles}
        fill={'grayModern.600'}
        _hover={{
          fill: 'brightBlue.600',
          color: 'brightBlue.600'
        }}
      >
        <ListIcon w="16px" h="16px" />
        <Text>{t('s3ServiceParams')}</Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered trapFocus={false}>
        <ModalOverlay />
        <ModalContent maxW={'600px'} bgColor={'#FFF'} backdropFilter="blur(150px)">
          <ModalCloseButton />
          <ModalHeader>{t('s3ServiceParams')}</ModalHeader>
          <ModalBody h="100%" w="100%" px="52px" py="32px">
            {miniouser.isSuccess ? (
              <VStack gap={'36px'} width={'full'} flex={1}>
                <Grid
                  templateColumns={'1fr 280px'}
                  width={'full'}
                  rowGap={'16px'}
                  columnGap={'60px'}
                >
                  {itemList.map((item) => (
                    <>
                      <GridItem key={item.key}>
                        <Text>{item.key}</Text>
                      </GridItem>
                      <GridItem>
                        <HStack gap="9px" color={'grayModern.700'}>
                          <Text textOverflow={'ellipsis'} whiteSpace={'nowrap'} overflow={'hidden'}>
                            {item.value}
                          </Text>
                          <IconButton
                            aria-label={'copy'}
                            variant={'white-bg-icon'}
                            p="4px"
                            icon={<CopyIcon boxSize={'14px'} />}
                            onClick={() => {
                              copyData(item.value);
                            }}
                          />
                          {'Secret Key' === item.key && <UpdateSecretKeyModal />}
                        </HStack>
                      </GridItem>
                    </>
                  ))}
                </Grid>
                <Button
                  variant={'solid'}
                  alignSelf={'self-end'}
                  px="25.5px"
                  py="8px"
                  fontWeight={'500'}
                  onClick={() => {
                    onClose();
                  }}
                >
                  {t('confirm')}
                </Button>
              </VStack>
            ) : (
              <Spinner />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
