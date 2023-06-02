import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  Box,
  Button
} from '@chakra-ui/react';
import { delDBByName } from '@/api/db';
import { useToast } from '@/hooks/useToast';

const DelModal = ({
  dbName,
  onClose,
  onSuccess
}: {
  dbName: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelApp = useCallback(async () => {
    try {
      setLoading(true);
      await delDBByName(dbName);
      toast({
        title: '删除成功',
        status: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: typeof error === 'string' ? error : error.message || '删除出现了意外',
        status: 'error'
      });
      console.error(error);
    }
    setLoading(false);
  }, [dbName, toast, onSuccess, onClose]);

  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>删除警告</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Box color={'myGray.600'}>
            如果确认要删除这个集群吗？如果执行此操作，将删除该集群的所有数据。
            <Box my={3}>
              请输入{' '}
              <Box as={'span'} color={'myGray.900'} fontWeight={'bold'} userSelect={'all'}>
                {dbName}
              </Box>{' '}
              确认
            </Box>
          </Box>

          <Input
            placeholder={`请输入：${dbName}`}
            value={inputValue}
            bg={'myWhite.300'}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant={'base'}>
            取消
          </Button>
          <Button
            colorScheme="red"
            ml={3}
            variant={'solid'}
            isDisabled={inputValue !== dbName}
            isLoading={loading}
            onClick={handleDelApp}
          >
            确认删除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DelModal;
