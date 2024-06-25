import MyIcon from '@/components/Icon';
import { useGlobalStore } from '@/store/global';
import { CloudServerPrice, CloudServerType } from '@/types/cloudserver';
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text
} from '@chakra-ui/react';
import { Decimal } from 'decimal.js';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export const priceItemStyle = {
  alignItems: 'center',
  py: '4px',
  px: '6px',
  borderRadius: 'base',
  _hover: {
    bg: 'grayModern.100'
  }
};

export const CostTipContent = ({
  prices,
  instanceType,
  isMonth,
  isModalTip
}: {
  isMonth: boolean;
  prices?: CloudServerPrice;
  instanceType?: CloudServerType;
  isModalTip?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      {prices && isModalTip && (
        <>
          <Flex
            alignItems={'center'}
            px={'12px'}
            py={'12px'}
            bg={'#FEF3F2'}
            borderRadius={'6px'}
            color={'#F04438'}
            gap={'8px'}
            mb={'16px'}
          >
            <MyIcon name="infoWarn" width={'20px'} />
            <Box>
              {t('After the annual and monthly cloud hosting is sold')}
              <Text display={'inline'} fontWeight={500} px={'2px'}>
                {t('No refund allowed')}
              </Text>
              {t('Pay Confirm tips')}
            </Box>
          </Flex>
          <Flex alignItems={'center'} justifyContent={'space-between'} pr={'10px'}>
            <Box px={'18px'} py={'12px'} fontWeight={'bold'} fontSize={'md'}>
              {t('total')}
            </Box>

            <Text fontWeight={'bold'} color={'brightBlue.600'}>
              ¥
              {new Decimal(prices?.diskPrice)
                .plus(new Decimal(prices?.instancePrice))
                .plus(new Decimal(prices?.networkPrice))
                .toNumber()}
            </Text>
          </Flex>
        </>
      )}
      <Box px={'18px'} py={'12px'} fontWeight={'bold'} fontSize={'md'}>
        {t('Configuration fee details')}
      </Box>
      <Divider />
      <Flex py={'7px'} px={'10px'} flexDirection={'column'} gap={'4px'}>
        <Flex {...priceItemStyle}>
          <Text fontSize={'base'}>{t('Instance')}</Text>
          <Text ml={'auto'} fontWeight={'bold'} color={'brightBlue.600'}>
            ¥{prices?.instancePrice}
            {!isMonth && `/${t('hour')}`}
          </Text>
        </Flex>

        <Flex {...priceItemStyle}>
          <Text alignSelf={'self-start'} fontSize={'base'} width={'50px'}>
            {t('storage fees')}
          </Text>
          <Text ml={'auto'} fontWeight={'bold'} color={'brightBlue.600'}>
            ¥{prices?.diskPrice}
            {!isMonth && `/${t('hour')}`}
          </Text>
        </Flex>

        <Flex {...priceItemStyle}>
          <Text alignSelf={'self-start'} fontSize={'base'} width={'50px'}>
            {t('Public network bandwidth')}
          </Text>
          <Text ml={'auto'} alignSelf={'self-start'} fontWeight={'bold'} color={'brightBlue.600'}>
            ¥{prices?.networkPrice}
            {!isMonth && `/${t('hour')}`}
          </Text>
        </Flex>
      </Flex>

      {/* Billing rules */}
      <Box px={'18px'} py={'12px'} fontWeight={'bold'} fontSize={'md'}>
        {t('Billing rules')}
      </Box>
      <Divider />
      <Flex py={'7px'} px={'10px'} flexDirection={'column'} gap={'4px'}>
        <Flex {...priceItemStyle} fontSize={'base'} justifyContent={'space-between'}>
          <Text w={'50px'} fontSize={'base'}>
            {t('Storage')}
          </Text>
          <Text fontSize={'base'}>
            {t('Reference fee disk tips', { price: instanceType?.diskPerG })}/
            {isMonth ? t('month') : t('hour')}
          </Text>
        </Flex>
        <Flex {...priceItemStyle} justifyContent={'space-between'}>
          <Text flexShrink={0} w={'50px'} alignSelf={'self-start'} fontSize={'base'} width={'50px'}>
            {t('BandWidth')}
          </Text>
          <Flex flexDirection={'column'} fontSize={'base'} wordBreak={'break-all'}>
            <Flex gap={'8px'} justifyContent={'space-between'}>
              <Text>{t('interval')}</Text>
              <Text>{t('price')}</Text>
            </Flex>
            {instanceType?.bandwidthPricingTiers.map((item, index) => {
              return (
                <Flex
                  gap={'8px'}
                  justifyContent={'space-between'}
                  key={item.pricePerMbps + item.minBandwidth}
                >
                  <Text>{`(${item.minBandwidth} , ${
                    item.maxBandwidth === null ? '∞' : item.maxBandwidth
                  }]`}</Text>
                  <Text>
                    {t('Reference fee bandwidth tips', { price: item.pricePerMbps })}/
                    {isMonth ? t('month') : t('hour')}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

const Header = ({
  title,
  applyCb,
  applyBtnText,
  prices,
  instanceType,
  isMonth
}: {
  isMonth: boolean;
  title: string;
  applyCb: () => void;
  applyBtnText: string;
  prices?: CloudServerPrice;
  instanceType?: CloudServerType;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();

  return (
    <Flex w={'100%'} px={10} h={'86px'} alignItems={'center'}>
      <Flex alignItems={'center'} cursor={'pointer'} onClick={() => router.replace(lastRoute)}>
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'grayModern.900'} fontSize={'2xl'}>
          {t(title)}
        </Box>
      </Flex>
      <Box flex={1}></Box>
      <Center mr={'12px'}>
        {prices ? (
          <Popover trigger="hover" closeDelay={600}>
            <PopoverTrigger>
              <Flex alignItems={'center'} p={'4px'} cursor={'pointer'} color={'grayModern.500'}>
                <Text fontSize={'base'} fontWeight={'bold'} mr={'4px'}>
                  {t('Reference fee')}
                </Text>

                <MyIcon name="help" width={'16px'} color={'grayModern.500'}></MyIcon>
                <Text ml={'6px'} color={'brightBlue.600'} fontSize={'xl'} fontWeight={'bold'}>
                  ¥
                  {new Decimal(prices?.diskPrice)
                    .plus(new Decimal(prices?.instancePrice))
                    .plus(new Decimal(prices?.networkPrice))
                    .toNumber()}
                </Text>
              </Flex>
            </PopoverTrigger>
            <PopoverContent>
              <CostTipContent isMonth={isMonth} instanceType={instanceType} prices={prices} />
            </PopoverContent>
          </Popover>
        ) : (
          <Text color={'grayModern.500'} fontWeight={'bold'}>
            {t('Fee inquiry in progress')}
          </Text>
        )}
      </Center>
      <Button w={'140px'} h={'40px'} onClick={applyCb}>
        {t(applyBtnText)}
      </Button>
    </Flex>
  );
};

export default Header;
