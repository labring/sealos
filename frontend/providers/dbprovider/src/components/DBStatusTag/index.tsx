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
  ModalCloseButton
} from '@chakra-ui/react';
import type { DBConditionItemType, DBStatusMapType } from '@/types/db';
import MyIcon from '../Icon';
import { useTranslation } from 'next-i18next';
import { formatPodTime } from '@/utils/tools';
import { I18nCommonKey } from '@/types/i18next';

const DBStatusTag = ({
  conditions = [],
  status,
  showBorder = false
}: {
  conditions: DBConditionItemType[];
  status: DBStatusMapType;
  showBorder?: boolean;
}) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const label = t(status.label as I18nCommonKey);

  return (
    <>
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
        whiteSpace={'nowrap'}
      >
        <Box w={'6px'} h={'6px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
        <Box ml={2} flex={1}>
          {label}
        </Box>
        <MyIcon ml={3} w={'16px'} name={'statusDetail'} cursor={'pointer'} onClick={onOpen} />
      </Flex>
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
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DBStatusTag;
