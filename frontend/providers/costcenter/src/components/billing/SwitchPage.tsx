import { Button, Flex, FlexProps, Img, Text } from '@chakra-ui/react';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import arrow_icon from '@/assert/Vector.svg';
import arrow_left_icon from '@/assert/toleft.svg';

export default function SwitchPage({
  totalPage,
  totalItem,
  pageSize,
  currentPage,
  setCurrentPage,
  ...props
}: {
  currentPage: number;
  totalPage: number;
  totalItem: number;
  pageSize: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
} & FlexProps) {
  const { t } = useTranslation();
  return (
    <Flex minW="370px" h="32px" align={'center'} mt={'20px'} {...props}>
      <Text>{t('Total')}:</Text>
      <Flex w="40px">{totalItem}</Flex>
      <Flex gap={'8px'}>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src}></Img>
        </Button>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage - 1);
          }}
        >
          <Img src={arrow_icon.src} transform={'rotate(-90deg)'}></Img>
        </Button>
        <Text>{currentPage}</Text>/<Text>{totalPage}</Text>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === totalPage}
          bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage + 1);
          }}
        >
          <Img src={arrow_icon.src} transform={'rotate(90deg)'}></Img>
        </Button>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === totalPage}
          bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
          mr={'10px'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(totalPage);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src} transform={'rotate(180deg)'}></Img>
        </Button>
      </Flex>
      <Text>{pageSize}</Text>
      <Text>/{t('Page')}</Text>
    </Flex>
  );
}
