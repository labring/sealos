import { TRANSFER_LIST_TYPE } from '@/constants/billing';
import { TransferType } from '@/types';
import { Button, Popover, PopoverContent, PopoverTrigger, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { Dispatch, SetStateAction } from 'react';

export default function TypeMenu({
  isDisabled,
  selectType,
  setType
}: {
  isDisabled: boolean;
  selectType: TransferType;
  setType: Dispatch<SetStateAction<TransferType>>;
}) {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const { t } = useTranslation();
  return (
    <Popover isOpen={isOpen} onClose={onClose} onOpen={onOpen}>
      <PopoverTrigger>
        <Button
          variant={'white-bg-icon'}
          w="110px"
          h="32px"
          fontStyle="normal"
          fontWeight="400"
          fontSize="12px"
          lineHeight="140%"
          border={'1px solid #DEE0E2'}
          bg={'#F6F8F9'}
          _expanded={{
            background: '#F8FAFB',
            border: `1px solid #36ADEF`
          }}
          isDisabled={isDisabled}
          _hover={{
            background: '#F8FAFB',
            border: `1px solid #36ADEF`
          }}
          borderRadius={'2px'}
        >
          {t(TRANSFER_LIST_TYPE[selectType].title)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        p={'6px'}
        boxSizing="border-box"
        w={'110px'}
        shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
        border={'none'}
      >
        {TRANSFER_LIST_TYPE.map((v) => (
          <Button
            variant={'white-bg-icon'}
            key={v.value}
            color={v.value === selectType ? '#0884DD' : '#5A646E'}
            h="30px"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight="400"
            lineHeight="18px"
            p={'0'}
            isDisabled={isDisabled}
            bg={v.value === selectType ? '#F4F6F8' : '#FDFDFE'}
            onClick={() => {
              setType(v.value);
              onClose();
            }}
          >
            {t(v.title)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
