import {
  Button,
  ButtonProps,
  Flex,
  FlexProps,
  Img,
  SystemCSSProperties,
  SystemStyleObject,
  Text
} from '@chakra-ui/react';
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
  setCurrentPage: (idx: number) => void;
} & FlexProps) {
  const { t } = useTranslation();
  const switchStyle: ButtonProps = {
    width: '24px',
    height: '24px',
    background: '#EDEFF1',
    // '#EDEFF1':'#F1F4F6'
    borderRadius: '9999px',
    color: '#262A32',
    flexGrow: '0',
    _hover: {
      opacity: '0.7'
    },
    _disabled: {
      color: '828289',
      background: '#F1F4F6'
    }
  };
  return (
    <Flex minW="370px" h="32px" align={'center'} mt={'20px'} {...props}>
      <Text>{t('Total')}:</Text>
      <Flex minW="40px" mr="5px">
        {totalItem}
      </Flex>
      <Flex gap={'8px'}>
        <Button
          {...switchStyle}
          isDisabled={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src}></Img>
        </Button>
        <Button
          {...switchStyle}
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
          {...switchStyle}
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
          {...switchStyle}
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
