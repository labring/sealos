import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Button,
  ButtonProps,
  Flex,
  FlexProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure
} from '@chakra-ui/react';
import { useCallback } from 'react';
// 多个下拉选项异步获取，如何处理菜单

export default function BaseMenu({
  isDisabled,
  itemlist,
  setItem,
  itemIdx,
  innerWidth = 'auto',
  neeReset = false,
  triggerRender,
  itemRender,
  ...props
}: {
  isDisabled: boolean;
  setItem: (idx: number) => void;
  itemIdx: number;
  itemlist: string[];
  neeReset?: boolean;
  triggerRender?: (props: { text: string; idx: number }) => JSX.Element;
  itemRender?: (props: { text: string; idx: number }) => JSX.Element;
  innerWidth?: ButtonProps['width'];
} & FlexProps) {
  const { isOpen, onClose, onOpen } = useDisclosure();

  const onClick = useCallback((idx: number) => {
    setItem(idx);
    onClose();
  }, []);
  // useEffect(() => {
  // 	if (neeReset) {
  // 		onClick(0);
  // 	}
  // }, [itemlist, neeReset]);

  return (
    <Flex {...props}>
      <Popover onClose={onClose} onOpen={onOpen} isOpen={isOpen}>
        <PopoverTrigger>
          <Button
            variant={'white-bg-icon'}
            // w="110px"
            justifyContent={'space-between'}
            w={innerWidth}
            h="32px"
            fontStyle="normal"
            fontWeight="400"
            fontSize="12px"
            lineHeight="140%"
            p={'8px 12px'}
            border={'1px solid '}
            borderColor={'grayModern.200'}
            bg={'grayModern.50'}
            _expanded={{
              background: 'grayModern.50',
              border: `1px solid grayModern.200`
            }}
            rightIcon={
              <ChevronDownIcon
                color={'grayModern.400'}
                transform={isOpen ? 'rotate(180deg)' : 'none'}
              />
            }
            isDisabled={isDisabled || itemlist.length === 0}
            _hover={{
              background: 'grayModern.50',
              border: `1px solid grayModern.200`
            }}
            borderRadius={'6px'}
          >
            {itemlist.length === 0
              ? ''
              : triggerRender
              ? triggerRender({ text: itemlist[itemIdx], idx: itemIdx })
              : itemlist[itemIdx]}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          p={'6px'}
          boxSizing="border-box"
          // w={'110px'}
          w={innerWidth}
          bgColor={'white'}
          // shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
          boxShadow={
            '0px 0px 1px 0px rgba(19, 51, 107, 0.1),0px 4px 10px 0px rgba(19, 51, 107, 0.1)'
          }
          border={'none'}
          gap={'4px'}
          borderRadius={'6px'}
        >
          {itemlist.map((v, idx) => (
            <Button
              variant={'white-bg-icon'}
              key={v + idx}
              w={'auto'}
              {...(idx === itemIdx
                ? {
                    color: 'brightBlue.600',
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }
                : {
                    color: 'grayModern.600',
                    bg: 'white'
                  })}
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight="400"
              lineHeight="18px"
              p={'4px 6px'}
              borderRadius={'4px'}
              justifyContent={'flex-start'}
              overflowX={'hidden'}
              whiteSpace={'nowrap'}
              textOverflow={'ellipsis'}
              onClick={() => onClick(idx)}
            >
              {itemRender ? itemRender({ text: v, idx }) : v}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
