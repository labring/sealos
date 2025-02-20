import useEnvStore from '@/stores/env';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

const BonusBox = (props: {
  onClick: () => void;
  selected: boolean;
  bouns: number;
  isFirst?: boolean;
  amount: number;
}) => {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);

  return (
    <Flex
      width="140px"
      height="92px"
      justify={'center'}
      align={'center'}
      border="1.5px solid"
      {...(props.selected
        ? {
            color: 'brightBlue.600',
            borderColor: 'brightBlue.500'
          }
        : {
            borderColor: '#EFF0F1'
          })}
      bg={'grayModern.100'}
      borderRadius="4px"
      position={'relative'}
      flexGrow="0"
      cursor={'pointer'}
      onClick={(e) => {
        e.preventDefault();
        props.onClick();
      }}
    >
      {props.isFirst ? (
        <Flex
          position={'absolute'}
          minW={'max-content'}
          right={'-6px'}
          top="-18px"
          color={'royalBlue.700'}
          background="royalBlue.100"
          alignItems={'center'}
          borderRadius="2px"
          zIndex={'99'}
          fontStyle="normal"
          fontWeight="500"
          fontSize="12px"
          _before={{
            position: 'absolute',
            inset: 'auto',
            borderRadius: '2px',
            width: '50px',
            height: '50px',
            content: '""',
            transform: 'rotate(45deg)',
            zIndex: '-1',
            bgColor: 'royalBlue.100'
          }}
          w="50px"
          h="50px"
          align={'center'}
          justify={'center'}
        >
          <Flex flexDirection={'column'} align={'center'}>
            <Text>{t('Double')}!</Text>
            <Flex align={'center'}>
              +
              <CurrencySymbol boxSize={'10px'} mr={'2px'} type={currency} />
              <Text>{props.bouns}</Text>
            </Flex>
          </Flex>
        </Flex>
      ) : props.bouns !== 0 ? (
        <Flex
          position={'absolute'}
          minW={'max-content'}
          left="78px"
          top="4px"
          px={'9.5px'}
          py={'2.5px'}
          color={'purple.600'}
          background="purple.100"
          alignItems={'center'}
          borderRadius="10px 10px 10px 0px"
          zIndex={'99'}
          fontStyle="normal"
          fontWeight="500"
          fontSize="12px"
        >
          <Text mr="4px">{t('Bonus')}</Text>
          <CurrencySymbol boxSize={'10px'} mr={'2px'} />
          <Text> {props.bouns}</Text>
        </Flex>
      ) : (
        <></>
      )}
      <Flex align={'center'} fontSize="24px">
        <CurrencySymbol boxSize="20px" type={currency} />
        <Text ml="4px" fontStyle="normal" fontWeight="500">
          {props.amount}
        </Text>
      </Flex>
    </Flex>
  );
};
export default BonusBox;
