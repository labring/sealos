import { Button, Flex, FlexProps, Img, Input } from '@chakra-ui/react';
import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
export default function SearchBox({
  isDisabled,
  setOrderID,
  ...props
}: {
  isDisabled: boolean;
  setOrderID: (val: string) => void;
} & FlexProps) {
  const { t } = useTranslation();
  const [searchValue, setSearch] = useState('');
  return (
    <Flex align={'center'} ml={'auto'} mb={'24px'} {...props}>
      <Flex
        mr="16px"
        border="1px solid #DEE0E2"
        h="32px"
        align={'center'}
        py={'10.3px'}
        pl={'9.3px'}
        borderRadius={'2px'}
      >
        <Img src={magnifyingGlass_icon.src} w={'14px'} mr={'8px'}></Img>
        <Input
          isDisabled={isDisabled}
          variant={'unstyled'}
          placeholder={t('Order Number') as string}
          value={searchValue}
          onChange={(v) => setSearch(v.target.value)}
        ></Input>
      </Flex>
      <Button
        isDisabled={isDisabled}
        variant={'unstyled'}
        display="flex"
        justifyContent={'center'}
        alignContent={'center'}
        width="88px"
        height="32px"
        bg="#24282C"
        borderRadius="4px"
        color={'white'}
        fontWeight="500"
        fontSize="14px"
        _hover={{
          opacity: '0.5'
        }}
        onClick={(e) => {
          e.preventDefault();
          setOrderID(searchValue);
        }}
      >
        {t('Search')}
      </Button>
    </Flex>
  );
}
