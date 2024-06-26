import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useOverviewStore from '@/stores/overview';
import { Button, Flex, Popover, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export default function NamespaceMenu({ isDisabled }: { isDisabled: boolean }) {
  const startTime = useOverviewStore((s) => s.startTime);
  const endTime = useOverviewStore((s) => s.endTime);
  const [namespaceIdx, setNamespaceIdx] = useState(0);
  const { setNamespace } = useBillingStore();
  const { data: nsListData } = useQuery({
    queryFn() {
      return request.post('/api/billing/getNamespaceList', {
        startTime,
        endTime
      });
    },
    queryKey: [
      'nsList',
      {
        startTime,
        endTime
      }
    ]
  });
  const { t } = useTranslation();
  const namespaceList: string[] = [
    t('All Namespace'),
    ...((nsListData?.data?.list as string[]) || [])
  ];
  return (
    <Flex align={'center'} ml="28px">
      <Popover>
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
            {namespaceList[namespaceIdx]}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          p={'6px'}
          boxSizing="border-box"
          w={'110px'}
          shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
          border={'none'}
        >
          {namespaceList.map((v, idx) => (
            <Button
              key={v}
              {...(idx === namespaceIdx
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
                setNamespaceIdx(idx);
                setNamespace(idx === 0 ? '' : v);
              }}
              _hover={{
                bg: ''
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
