import { Button, ButtonProps, Flex, FlexProps, Img, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import arrow_icon from '@/assert/Vector.svg';
import arrow_left_icon from '@/assert/toleft.svg';
import arrorw_icon_disabled from '@/assert/Vector_disbabled.svg';
import arrow_left_icon_disabled from '@/assert/toleft_disabled.svg';

export default function SwitchPage({
  totalPage,
  totalItem,
  pageSize,
  currentPage,
  setCurrentPage,
  isPreviousData,
  ...props
}: {
  currentPage: number;
  totalPage: number;
  totalItem: number;
  pageSize: number;
  isPreviousData?: boolean;
  setCurrentPage: (idx: number) => void;
} & FlexProps) {
  const { t } = useTranslation();
  const switchStyle: ButtonProps = {
    width: '24px',
    height: '24px',
    minW: '0',
    background: 'grayModern.250',
    flexGrow: '0',
    borderRadius: 'full',
    // variant:'unstyled',
    _hover: {
      background: 'grayModern.150',
      minW: '0'
    },
    _disabled: {
      borderRadius: 'full',
      background: 'grayModern.150',
      cursor: 'not-allowed',
      minW: '0'
    }
  };
  return (
    <Flex minW="370px" h="32px" align={'center'} mt={'20px'} fontSize="14px" {...props}>
      <Text fontSize="14px" color={'grayModern.500'}>
        {t('common:total')}:
      </Text>
      <Flex mr="25px" color={'grayModern.500'}>
        {totalItem}
      </Flex>
      <Flex gap={'8px'}>
        <Button
          {...switchStyle}
          isDisabled={currentPage === 1}
          bg={currentPage !== 1 ? 'grayModern.250' : 'grayModern.150'}
          p="0"
          minW="0"
          boxSize="24px"
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <Img
            w="6px"
            h="6px"
            src={currentPage !== 1 ? arrow_left_icon.src : arrow_left_icon_disabled.src}
          ></Img>
        </Button>
        <Button
          {...switchStyle}
          isDisabled={currentPage === 1}
          bg={currentPage !== 1 ? 'grayModern.250' : 'grayModern.150'}
          p="0"
          minW="0"
          boxSize="24px"
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage - 1);
          }}
        >
          <Img
            src={currentPage !== 1 ? arrow_icon.src : arrorw_icon_disabled.src}
            transform={'rotate(-90deg)'}
          ></Img>
        </Button>
        <Text color={'grayModern.500'}>{currentPage}</Text>
        <Text color={'grayModern.500'}>/</Text>
        <Text color={'grayModern.900'}>{totalPage}</Text>
        <Button
          {...switchStyle}
          isDisabled={isPreviousData || currentPage >= totalPage}
          bg={currentPage !== totalPage ? 'grayModern.250' : 'grayModern.150'}
          boxSize="24px"
          p="0"
          minW="0"
          borderRadius={'50%'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage + 1);
          }}
        >
          <Img w="6px" h="6px" src={arrow_icon.src} transform={'rotate(90deg)'}></Img>
        </Button>
        <Button
          {...switchStyle}
          isDisabled={isPreviousData || currentPage >= totalPage}
          bg={currentPage !== totalPage ? 'grayModern.250' : 'grayModern.150'}
          boxSize="24px"
          p="0"
          minW="0"
          borderRadius={'50%'}
          mr={'10px'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(totalPage);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src} transform={'rotate(180deg)'}></Img>
        </Button>
      </Flex>
      <Text fontSize="12px" fontWeight="500" color={'grayModern.900'}>
        {pageSize}
      </Text>
      <Text fontSize="12px" fontWeight="500" color={'grayModern.500'}>
        /{t('common:page')}
      </Text>
    </Flex>
  );
}
