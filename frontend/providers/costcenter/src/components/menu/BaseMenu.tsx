import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Button,
  ButtonProps,
  Flex,
  FlexProps,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useCallback, useRef, useState } from 'react';
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
  searchPlaceholder,
  emptyText,
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
  searchPlaceholder?: string;
  emptyText?: string;
} & FlexProps) {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const closeMenu = useCallback(() => {
    onClose();
    setSearch('');
  }, [onClose]);
  // Preserve the original index after searching so selection still uses the namespace ID.
  const visibleItems = itemlist
    .map((text, idx) => ({ text, idx }))
    .filter(
      ({ text, idx }) =>
        !searchPlaceholder || idx === 0 || text.toLowerCase().includes(search.trim().toLowerCase())
    );

  const onClick = useCallback(
    (idx: number) => {
      setItem(idx);
      closeMenu();
    },
    [setItem, closeMenu]
  );
  // useEffect(() => {
  // 	if (neeReset) {
  // 		onClick(0);
  // 	}
  // }, [itemlist, neeReset]);

  return (
    <Flex {...props}>
      <Popover
        onClose={closeMenu}
        onOpen={onOpen}
        isOpen={isOpen}
        initialFocusRef={searchPlaceholder ? searchRef : undefined}
      >
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
          {searchPlaceholder && (
            <Input
              ref={searchRef}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="sm"
              fontSize="12px"
              borderRadius="4px"
            />
          )}
          <Flex direction="column" gap="4px" maxH="240px" overflowY="auto">
            {visibleItems.map(({ text: v, idx }) => (
              <Button
                variant={'white-bg-icon'}
                key={v + idx}
                flexShrink={0}
                title={v}
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
            {searchPlaceholder && search.trim() && visibleItems.every(({ idx }) => idx === 0) && (
              <Text role="status" fontSize="12px" color="grayModern.600" px="6px" py="4px">
                {emptyText}
              </Text>
            )}
          </Flex>
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
