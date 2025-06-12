import { getInviterId, setInviterId } from '@/utils/sessionConfig';
import { CloseIcon } from '@chakra-ui/icons';
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  IconButton,
  useColorModeValue,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverBody,
  PopoverContent,
  PopoverCloseButton,
  PopoverFooter,
  useDisclosure
} from '@chakra-ui/react';
import { PencilLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

const InviterPop = () => {
  const { isOpen, onToggle, onClose, onOpen } = useDisclosure();
  const { t } = useTranslation(['v2', 'common']);
  const bg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.900', 'gray.100');
  const placeholderColor = useColorModeValue('gray.500', 'gray.400');
  const [inviteId, updateInviteId] = useState('');
  const [_inviteId, update_inviteId] = useState('');
  useEffect(() => {
    const id = getInviterId();
    updateInviteId(id || '');
    update_inviteId(id || '');
  }, []);
  return (
    <Popover isOpen={isOpen} onClose={onClose} onOpen={onOpen}>
      <PopoverTrigger>
        {_inviteId ? (
          <Flex
            // width="195px"
            height="40px"
            padding="10px"
            // gap="10px"
            bg="#FAFAFA"
            borderRadius="8px"
            align={'center'}
          >
            <Text height="20px" fontSize="14px" lineHeight="20px" color="#71717A">
              {t('v2:invite_id')}:
            </Text>
            <Text height="20px" fontSize="14px" lineHeight="20px" color="#18181B">
              {getInviterId()}
            </Text>
            <Box width="0" height="18.91px" border="1px solid #E4E4E7" ml={'10px'} mr={'4px'}></Box>
            <Button
              boxSize="32px"
              borderRadius="6px"
              minW={'unset'}
              variant={'unstyled'}
              _hover={{ bgColor: '#F4F4F5' }}
            >
              <Icon as={PencilLine} boxSize="14px" />
            </Button>
          </Flex>
        ) : (
          <Button variant={'ghost'}>{t('v2:input_invite_id')}</Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        right={'0'}
        width="425px"
        height="178px"
        padding="24px"
        gap="16px"
        bg={bg}
        borderColor={borderColor}
        boxShadow="lg"
        borderRadius="8px"
        display="flex"
        flexDirection="column"
        alignItems="flex-end"
      >
        <Flex width="377px" height="18px" flexDirection="column" alignItems="flex-start" gap="6px">
          <Text
            width="377px"
            height="18px"
            fontSize="18px"
            lineHeight="100%"
            fontWeight="600"
            color={textColor}
          >
            {t('v2:input_invite_id')}
          </Text>
        </Flex>
        <Flex width="377px" height="40px" flexDirection="column" alignItems="flex-start" gap="8px">
          <Input
            width="377px"
            height="40px"
            padding="8px 12px"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="8px"
            placeholder={t('invite_id')}
            _placeholder={{ color: placeholderColor }}
            value={inviteId || ''}
            onChange={(v) => {
              updateInviteId(v.target.value);
            }}
          />
        </Flex>

        <Button
          px={'16px'}
          py={'10px'}
          padding="8px 16px"
          bg="gray.900"
          ml={'auto'}
          borderRadius="8px"
          color="white"
          onClick={() => {
            update_inviteId(inviteId);
            setInviterId(inviteId);
            onClose();
          }}
        >
          {t('common:confirm')}
        </Button>

        <PopoverCloseButton />
      </PopoverContent>
    </Popover>
  );
};

export default InviterPop;
