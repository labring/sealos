import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import { ApiResp } from '@/types';
import {
  Button,
  Flex,
  FlexProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export default function AppMenu({
  isDisabled,
  ...props
}: {
  isDisabled: boolean;
} & FlexProps) {
  const [appIdx, setAppIdx] = useState(0);
  const { data } = useQuery({
    queryFn() {
      return request<any, ApiResp<{ appList: string[] }>>('/api/billing/getAppList');
    },
    queryKey: ['appList']
  });
  const { setAppType } = useBillingStore();
  const { isOpen, onClose, onOpen } = useDisclosure();
  const { t } = useTranslation();
  const { t: appT } = useTranslation('applist');
  const appList: string[] = ['All APP', ...(data?.data?.appList || [])].map((v) => appT(v));
  return (
    <Flex align={'center'} ml="28px" {...props}>
      <Popover onClose={onClose} onOpen={onOpen} isOpen={isOpen}>
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
            {appList[appIdx]}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          p={'6px'}
          boxSizing="border-box"
          w={'110px'}
          shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
          border={'none'}
        >
          {appList.map((v, idx) => (
            <Button
              variant={'white-bg-icon'}
              key={v}
              {...(idx === appIdx
                ? {
                    color: '#0884DD',
                    bg: '#F4F6F8'
                  }
                : {
                    color: '#5A646E',
                    bg: '#FDFDFE'
                  })}
              h="30px"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight="400"
              lineHeight="18px"
              p={'0'}
              isDisabled={isDisabled}
              onClick={() => {
                setAppIdx(idx);
                setAppType(idx === 0 ? '' : appList[idx]);
                onClose();
              }}
            >
              {v}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
