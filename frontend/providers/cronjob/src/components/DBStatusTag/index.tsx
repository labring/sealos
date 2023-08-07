import React from 'react';
import {
  Flex,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure
} from '@chakra-ui/react';
import type { DBConditionItemType, DBStatusMapType } from '@/types/db';
import MyIcon from '../Icon';
import { useTranslation } from 'next-i18next';
import { formatPodTime } from '@/utils/tools';

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
        <Box w={'10px'} h={'10px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
        <Box ml={2} flex={1}>
          {t(status.label)}
        </Box>
        <MyIcon ml={3} w={'16px'} name={'statusDetail'} cursor={'pointer'} onClick={onOpen} />
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent minW={'520px'}>
          <ModalHeader fontSize={'3xl'} display={'flex'}>
            <Box flex={1}>{t(status.label)}</Box>
            <Flex
              h={'32px'}
              w={'32px'}
              alignItems={'center'}
              justifyContent={'center'}
              borderRadius={'50%'}
              bg={'#F7F7F7'}
              cursor={'pointer'}
              onClick={onClose}
            >
              <MyIcon name={'statusDetail'} color={'myGray.800'} w={'20px'} />
            </Flex>
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
                  borderColor: item.status === 'False' ? '#FF8492' : '#33BABB'
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
