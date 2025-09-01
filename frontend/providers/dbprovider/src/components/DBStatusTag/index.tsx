import React from 'react';
import {
  Flex,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  ModalCloseButton,
  IconButton,
  Tooltip,
  Text
} from '@chakra-ui/react';
import type { DBConditionItemType, DBStatusMapType } from '@/types/db';
import MyIcon from '../Icon';
import { useTranslation } from 'next-i18next';
import { formatPodTime } from '@/utils/tools';
import { I18nCommonKey } from '@/types/i18next';
import { DBStatusEnum } from '@/constants/db';

const DBStatusTag = ({
  conditions = [],
  status,
  showBorder = false,
  alertReason,
  alertDetails
}: {
  conditions: DBConditionItemType[];
  status: DBStatusMapType;
  showBorder?: boolean;
  alertReason?: string;
  alertDetails?: string;
}) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isQuestionOpen,
    onOpen: onQuestionOpen,
    onClose: onQuestionClose
  } = useDisclosure();
  const label = t(status.label as I18nCommonKey);

  // Check if status is not Running or Stopped
  const shouldShowQuestionIcon =
    status.value !== DBStatusEnum.Running && status.value !== DBStatusEnum.Stopped && alertReason;

  return (
    <>
      <Flex alignItems={'center'}>
        <Flex
          color={status.color}
          backgroundColor={status.backgroundColor}
          border={showBorder ? '1px solid' : 'none'}
          borderColor={status.color}
          py={2}
          px={3}
          borderRadius={'24px'}
          fontSize={'xs'}
          fontWeight={'bold'}
          alignItems={'center'}
          minW={'88px'}
          maxW={'110px'}
          whiteSpace={'nowrap'}
        >
          <Box w={'6px'} h={'6px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
          <Box ml={2} flex={1}>
            {label}
          </Box>
          <MyIcon ml={3} w={'16px'} name={'statusDetail'} cursor={'pointer'} onClick={onOpen} />
        </Flex>
        {shouldShowQuestionIcon && (
          <Tooltip label={t('click_for_details')} placement="top">
            <IconButton
              ml={2}
              size="xs"
              variant="ghost"
              aria-label="Question mark"
              icon={<MyIcon name="help" w="14px" h="14px" color="#F04438" />}
              onClick={onQuestionOpen}
              color="#F04438"
              backgroundColor="#FEF3F2"
              w="14px"
              h="14px"
              minW="14px"
              minH="14px"
            />
          </Tooltip>
        )}

        {/* Status details modal */}
        <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
          <ModalOverlay />
          <ModalContent minW={'520px'}>
            <ModalHeader display={'flex'} alignItems={'center'}>
              <Box flex={1}>{label}</Box>
              <ModalCloseButton top={'10px'} right={'10px'} />
            </ModalHeader>
            <ModalBody>
              {conditions.map((item, i) => (
                <Box
                  key={i}
                  pl={6}
                  pb={6}
                  ml={4}
                  borderLeft={`2px solid ${
                    i === conditions.length - 1 ? 'transparent' : '#DCE7F1'
                  }`}
                  position={'relative'}
                  _before={{
                    content: '""',
                    position: 'absolute',
                    left: '-6.5px',
                    w: '8px',
                    h: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    border: '2px solid',
                    borderColor: item.status === 'False' ? '#D92D20' : '#039855'
                  }}
                >
                  <Flex lineHeight={1} mb={2} alignItems={'center'}>
                    <Box fontWeight={'bold'}>
                      {item.reason},&ensp;Last Occur:{' '}
                      {formatPodTime(item.lastTransitionTime as unknown as Date)}
                    </Box>
                  </Flex>
                  <Box color={'blackAlpha.700'}>{item.message}</Box>
                </Box>
              ))}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Question mark modal */}
        <Modal isOpen={isQuestionOpen} onClose={onQuestionClose} lockFocusAcrossFrames={false}>
          <ModalOverlay />
          <ModalContent minW={'520px'}>
            <ModalHeader display={'flex'} alignItems={'center'}>
              <Box flex={1}>{alertReason || 'Status Details'}</Box>
              <ModalCloseButton top={'10px'} right={'10px'} />
            </ModalHeader>
            <ModalBody>
              <Box whiteSpace={'pre-wrap'} color={'gray.700'}>
                {alertDetails || ''}
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Flex>
    </>
  );
};

export default DBStatusTag;
