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
import { Maximize2 } from 'lucide-react';

type DBStatusDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  conditions?: DBConditionItemType[];
  details?: string;
};

export const DBStatusDetailsModal = ({
  isOpen,
  onClose,
  title,
  conditions = [],
  details
}: DBStatusDetailsModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'520px'}>
        <ModalHeader display={'flex'} alignItems={'center'}>
          <Box flex={1}>{title}</Box>
          <ModalCloseButton top={'10px'} right={'10px'} />
        </ModalHeader>
        <ModalBody>
          {conditions.length > 0 ? (
            conditions.map((item, i) => (
              <Box
                key={i}
                pl={6}
                pb={6}
                ml={4}
                borderLeft={`2px solid ${i === conditions.length - 1 ? 'transparent' : '#DCE7F1'}`}
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
            ))
          ) : (
            <Box whiteSpace={'pre-wrap'} color={'gray.700'}>
              {details || ''}
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const DBStatusTag = ({
  conditions = [],
  status,
  showBorder = false,
  alertReason,
  alertDetails,
  onOpenDetails,
  onOpenQuestionDetails,
  renderInternalModals = true
}: {
  conditions: DBConditionItemType[];
  status: DBStatusMapType;
  showBorder?: boolean;
  alertReason?: string;
  alertDetails?: string;
  onOpenDetails?: () => void;
  onOpenQuestionDetails?: () => void;
  renderInternalModals?: boolean;
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
  const openDetails = onOpenDetails ?? onOpen;
  const openQuestionDetails = onOpenQuestionDetails ?? onQuestionOpen;

  return (
    <>
      <Flex alignItems={'center'}>
        <Flex
          display={'flex'}
          height={'20px'}
          justifyContent={'center'}
          alignItems={'center'}
          gap={'8px'}
          py={0}
          px={0}
          borderRadius={'0px'}
          fontSize={'14px'}
          fontWeight={'500'}
          minW={'auto'}
          maxW={'none'}
          whiteSpace={'nowrap'}
        >
          <Box
            w={'8px'}
            h={'8px'}
            borderRadius={'2px'}
            border={'1px solid rgba(0, 0, 0, 0.05)'}
            backgroundColor={status.value === DBStatusEnum.Running ? '#10B981' : status.dotColor}
          />
          <Box
            color={'#18181B'}
            fontSize={'14px'}
            fontWeight={'500'}
            lineHeight={'20px'}
            fontFamily={'Geist, sans-serif'}
          >
            {label}
          </Box>
          <Maximize2 size={14} color="#71717A" cursor={'pointer'} onClick={openDetails} />
        </Flex>
        {shouldShowQuestionIcon && (
          <Tooltip label={t('click_for_details')} placement="top">
            <IconButton
              ml={2}
              size="xs"
              variant="ghost"
              aria-label="Question mark"
              icon={<MyIcon name="help" w="14px" h="14px" color="#F04438" />}
              onClick={openQuestionDetails}
              color="#F04438"
              backgroundColor="#FEF3F2"
              w="14px"
              h="14px"
              minW="14px"
              minH="14px"
            />
          </Tooltip>
        )}

        {renderInternalModals && (
          <DBStatusDetailsModal
            isOpen={isOpen}
            onClose={onClose}
            title={label}
            conditions={conditions}
          />
        )}

        {/* Question mark modal */}
        {renderInternalModals && (
          <DBStatusDetailsModal
            isOpen={isQuestionOpen}
            onClose={onQuestionClose}
            title={alertReason || 'Status Details'}
            details={alertDetails}
          />
        )}
      </Flex>
    </>
  );
};

export default DBStatusTag;
