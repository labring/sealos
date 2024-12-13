// SwitchPage.tsx
import React from 'react';
import { Button, ButtonProps, Flex, FlexProps, Text, Icon, IconProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

function ToLeftIcon(props: IconProps) {
  return (
    <Icon
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="12px"
      height="12px"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M5.414 5.99999L7.889 8.47499L7.182 9.18199L4 5.99999L7.182 2.81799L7.889 3.52499L5.414 5.99999Z"
        fill="#111824"
      />
    </Icon>
  );
}

function RightFirstIcon(props: IconProps) {
  return (
    <Icon
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="12px"
      height="12px"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M2.79492 3.705L5.08992 6L2.79492 8.295L3.49992 9L6.49992 6L3.49992 3L2.79492 3.705ZM7.99992 3H8.99992V9H7.99992V3Z"
        fill="#111824"
      />
    </Icon>
  );
}

interface SwitchPageProps {
  currentPage: number;
  totalPage: number;
  totalItem: number;
  pageSize: number;
  isPreviousData?: boolean;
  setCurrentPage: (idx: number) => void;
}

const SwitchPage: React.FC<SwitchPageProps & FlexProps> = ({
  currentPage,
  totalPage,
  totalItem,
  pageSize,
  setCurrentPage,
  isPreviousData,
  ...props
}) => {
  const { t } = useTranslation();
  const switchStyle: ButtonProps = {
    width: '24px',
    height: '24px',
    minW: '0',
    background: 'grayModern.250',
    flexGrow: '0',
    borderRadius: 'full',
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
    <Flex>
      <Button
        onClick={() => setCurrentPage(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      <Button
        onClick={() => setCurrentPage(currentPage + 1)}
        disabled={currentPage >= totalPage}
      >
        Next
      </Button>
      <Text fontSize="14px" color={'grayModern.500'}>
        {t('Total')}:
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
          <RightFirstIcon transform={'rotate(-180deg)'} />
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
          <ToLeftIcon />
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
          <ToLeftIcon transform={'rotate(180deg)'} />
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
          <RightFirstIcon />
        </Button>
      </Flex>
      <Text fontSize="12px" fontWeight="500" color={'grayModern.900'}>
        {pageSize}
      </Text>
      <Text fontSize="12px" fontWeight="500" color={'grayModern.500'}>
        /{t('Page')}
      </Text>
    </Flex>
  );
};

export default SwitchPage;