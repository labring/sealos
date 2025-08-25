import { Flex, FlexProps, Icon, Text } from '@chakra-ui/react';
import { useState } from 'react';
type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  onPageChange: any;
};

export default function Pagination({ totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPage = Math.ceil(totalItems / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPage) {
      setCurrentPage(page);
      onPageChange(page);
    }
  };

  const handlePrevPage = () => {
    goToPage(currentPage - 1);
  };

  const handleNextPage = () => {
    goToPage(currentPage + 1);
  };

  const buttonStyle: FlexProps = {
    justifyContent: 'center',
    alignItems: 'center',
    w: '24px',
    h: '24px',
    borderRadius: '50%'
  };

  return (
    <Flex minW="350px" pr="8px" h="32px" ml="auto" align="center" mt="20px" justifyContent={'end'}>
      <Text>Total:</Text>
      <Flex w="40px">{totalItems}</Flex>
      <Flex gap="8px" alignItems={'center'}>
        <Flex
          onClick={() => goToPage(1)}
          {...buttonStyle}
          {...{
            bg: currentPage === 1 ? '#EDF0F2' : '#EDEFF1',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? '0.5' : '1'
          }}
        >
          <Icon viewBox="0 0 12 12" fill={currentPage === 1 ? 'black' : '#262A32'}>
            <path d="M9.205 8.295L6.91 6L9.205 3.705L8.5 3L5.5 6L8.5 9L9.205 8.295ZM3 3H4V9H3V3Z" />
          </Icon>
        </Flex>
        <Flex
          {...buttonStyle}
          {...{
            bg: currentPage === 1 ? '#EDF0F2' : '#EDEFF1',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? '0.5' : '1'
          }}
          onClick={handlePrevPage}
        >
          <Icon viewBox="0 0 12 12" fill={currentPage === 1 ? 'black' : '#262A32'}>
            <path
              d="M5.414 5.99999L7.889 8.47499L7.182 9.18199L4 5.99999L7.182 2.81799L7.889 3.52499L5.414 5.99999Z"
              fill="#262A32"
            />
          </Icon>
        </Flex>

        <Text>
          {currentPage}/{totalPage}
        </Text>

        <Flex
          {...buttonStyle}
          {...{
            bg: currentPage === totalPage ? '#EDF0F2' : '#EDEFF1',
            cursor: currentPage === totalPage ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPage ? '0.5' : '1'
          }}
          onClick={handleNextPage}
        >
          <Icon
            viewBox="0 0 12 12"
            fill={currentPage === 1 ? 'black' : '#262A32'}
            transform="rotate(180deg)"
          >
            <path
              d="M5.414 5.99999L7.889 8.47499L7.182 9.18199L4 5.99999L7.182 2.81799L7.889 3.52499L5.414 5.99999Z"
              fill="#262A32"
            />
          </Icon>
        </Flex>
        <Flex
          mr="10px"
          {...buttonStyle}
          {...{
            bg: currentPage === totalPage ? '#EDF0F2' : '#EDEFF1',
            cursor: currentPage === totalPage ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPage ? '0.5' : '1'
          }}
          onClick={() => goToPage(totalPage)}
        >
          <Icon
            viewBox="0 0 12 12"
            transform="rotate(180deg)"
            fill={currentPage === 1 ? 'black' : '#262A32'}
          >
            <path d="M9.205 8.295L6.91 6L9.205 3.705L8.5 3L5.5 6L8.5 9L9.205 8.295ZM3 3H4V9H3V3Z" />
          </Icon>
        </Flex>
      </Flex>
      <Text>{itemsPerPage}</Text>
      <Text>/Page</Text>
    </Flex>
  );
}
