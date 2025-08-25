import { RightFirstIcon, ToLeftIcon } from '@/ui/icons'
import { Button, ButtonProps, Flex, FlexProps, Text } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'

export default function SwitchPage({
  totalPage,
  totalItem,
  pageSize,
  currentPage,
  setCurrentPage,
  isPreviousData,
  ...props
}: {
  currentPage: number
  totalPage: number
  totalItem: number
  pageSize: number
  isPreviousData?: boolean
  setCurrentPage: (idx: number) => void
} & FlexProps) {
  const { t } = useTranslation()
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
  }
  return (
    <Flex minW="370px" h="32px" align={'center'} mb={'8px'} fontSize="14px" {...props}>
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
            e.preventDefault()
            setCurrentPage(1)
          }}>
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
            e.preventDefault()
            setCurrentPage(currentPage - 1)
          }}>
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
            e.preventDefault()
            setCurrentPage(currentPage + 1)
          }}>
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
            e.preventDefault()
            setCurrentPage(totalPage)
          }}>
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
  )
}
