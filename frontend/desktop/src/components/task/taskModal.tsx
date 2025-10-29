import { IdeaIcon, RightArrowIcon } from '@/components/icons';
import { UserTask } from '@/types/task';
import { formatMoney } from '@/utils/format';
import {
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React, { useRef } from 'react';
import RealNameModal from '../account/RealNameModal';
import { useQuery } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { getAmount } from '@/api/auth';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: UserTask[];
  onTaskClick: (task: UserTask) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, tasks, onTaskClick }) => {
  const { t, i18n } = useTranslation();
  const { isOpen: isQRCodeOpen, onOpen: onQRCodeOpen, onClose: onQRCodeClose } = useDisclosure();
  const realNameModalRef = useRef<{ onOpen: () => void }>(null);
  const { session } = useSessionStore();

  const boxStyles = {
    border: '1px solid rgba(60, 101, 172, 0.08)',
    borderRadius: '6px',
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    width: '100%',
    cursor: 'pointer'
  };

  const { data: account } = useQuery({
    queryKey: ['getAmount', { userId: session?.user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!session?.user,
    staleTime: 60 * 1000
  });

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent
          maxW="900px"
          w="90vw"
          aspectRatio="3 / 2"
          bg={'linear-gradient(180deg, #FFFDFD 9.04%, #F6F7FE 46.15%, #FAFAFF 87.5%)'}
          borderRadius={'12px'}
          overflow="hidden"
        >
          <Image
            src="/images/driver-bg.png"
            alt="background"
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            objectFit="cover"
            zIndex={-1}
          />
          <Box position="relative" zIndex={1} padding="16px" height="100%">
            <Flex
              height={'100%'}
              flexDirection={'column'}
              justifyContent={'center'}
              alignItems={'center'}
            >
              <Box fontSize={'28px'} fontWeight={700} color={'grayModern.900'}>
                {t('common:sealos_newcomer_benefits')}
              </Box>
              <VStack spacing={'12px'} mt={'48px'} w={'550px'} minW={'fit-content'} maxW={'600px'}>
                {tasks.map((task) => (
                  <HStack
                    key={task.id}
                    {...boxStyles}
                    onClick={() => {
                      if (task.taskType === 'CONTACT') {
                        onQRCodeOpen();
                      } else if (task.taskType === 'REAL_NAME_AUTH') {
                        if (account?.data?.balance) {
                          realNameModalRef.current?.onOpen();
                        }
                      } else {
                        onTaskClick(task);
                      }
                    }}
                  >
                    <Flex alignItems={'center'} width="100%">
                      <Flex flex={1} alignItems={'center'} gap={'6px'}>
                        <IdeaIcon />
                        <Text
                          lineHeight={'20px'}
                          fontSize="14px"
                          fontWeight={500}
                          color="grayModern.900"
                        >
                          {task?.title?.[i18n.language]}
                        </Text>
                      </Flex>

                      <Text
                        flex={'0 0 80px'}
                        fontWeight={500}
                        color={'brightBlue.600'}
                        fontSize={'12px'}
                      >
                        {t('common:balance_text')} +{formatMoney(Number(task.reward) || 0)}
                      </Text>

                      {task.isCompleted ? (
                        <Text
                          color={'green.600'}
                          flex="0 0 70px"
                          fontSize={'12px'}
                          fontWeight={'500'}
                        >
                          {t('common:completed')}
                        </Text>
                      ) : (
                        <Flex
                          flex="0 0 70px"
                          alignItems={'center'}
                          gap={'4px'}
                          _hover={{
                            color: 'brightBlue.600'
                          }}
                        >
                          <Text fontSize={'12px'} fontWeight={'500'}>
                            {t('common:start_now')}
                          </Text>
                          <RightArrowIcon />
                        </Flex>
                      )}
                    </Flex>
                  </HStack>
                ))}
              </VStack>

              <Flex gap={'20px'} mt={'64px'}>
                <Button
                  minW="140px"
                  variant={'solid'}
                  onClick={() => {
                    const firstIncompleteTask = tasks.find((task) => !task.isCompleted);
                    if (!firstIncompleteTask) return;
                    if (firstIncompleteTask.taskType === 'CONTACT') {
                      onQRCodeOpen();
                    } else if (firstIncompleteTask.taskType === 'REAL_NAME_AUTH') {
                      if (account?.data?.balance) {
                        realNameModalRef.current?.onOpen();
                      }
                    } else {
                      onTaskClick(firstIncompleteTask);
                    }
                  }}
                >
                  {t('common:start_now')}
                </Button>
                <Button
                  minW="140px"
                  variant={'outline'}
                  onClick={onClose}
                  _hover={{
                    bg: 'white',
                    color: 'brightBlue.600'
                  }}
                >
                  {t('common:view_later')}
                </Button>
              </Flex>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
      <Modal isOpen={isQRCodeOpen} onClose={onQRCodeClose} isCentered>
        <ModalOverlay />
        <ModalContent w={'450px'} h={'430px'}>
          <ModalCloseButton right={'20px'} top="12px" p="0" />
          <ModalHeader
            bg={'grayModern.25'}
            borderBottomWidth={'1px'}
            borderBottomColor={'grayModern.100'}
            p="15px 20px"
          >
            <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
              {t('common:scan_to_join_group')}
            </Text>
          </ModalHeader>

          <Flex h={'100%'} direction="column" alignItems={'center'} justifyContent={'center'}>
            <Image
              src="/images/customer-service-qr.png"
              alt="QR Code"
              width="240px"
              height="240px"
            />

            <Text mt="16px" fontSize="16px" fontWeight={500} color="grayModern.900">
              {t('common:scan_to_join_group')}
            </Text>
          </Flex>
        </ModalContent>
      </Modal>
      <RealNameModal ref={realNameModalRef} />
    </>
  );
};

export default TaskModal;
