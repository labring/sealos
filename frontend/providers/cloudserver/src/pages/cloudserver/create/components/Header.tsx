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
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Decimal } from 'decimal.js';

const Header = ({
  title,
  applyCb,
  applyBtnText,
  prices,
  instanceType
}: {
  title: string;
  applyCb: () => void;
  applyBtnText: string;
  prices?: CloudServerPrice;
  instanceType?: CloudServerType;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();

  const priceItemStyle = {
    alignItems: 'center',
    py: '4px',
    px: '6px',
    borderRadius: 'base',
    _hover: {
      bg: 'grayModern.100'
    }
  };

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
              <PopoverHeader px={'18px'} py={'12px'} fontWeight={'bold'} fontSize={'md'}>
                {t('Configuration fee details')}
              </PopoverHeader>
              <PopoverArrow />
              <PopoverBody>
                <Flex flexDirection={'column'} gap={'4px'}>
                  <Flex {...priceItemStyle}>
                    <Text fontSize={'base'}>{t('Instance')}</Text>
                    <Text ml={'auto'} fontWeight={'bold'} color={'brightBlue.600'}>
                      ¥{prices?.instancePrice}/{t('hour')}
                    </Text>
                  </Flex>

                  <Flex {...priceItemStyle}>
                    <Text alignSelf={'self-start'} fontSize={'base'} width={'50px'}>
                      {t('storage fees')}
                    </Text>
                    <Text ml={'auto'} fontWeight={'bold'} color={'brightBlue.600'}>
                      ¥{prices?.diskPrice}/{t('hour')}
                    </Text>
                  </Flex>

                  <Flex {...priceItemStyle}>
                    <Text alignSelf={'self-start'} fontSize={'base'} width={'50px'}>
                      {t('Public network bandwidth')}
                    </Text>
                    <Text
                      ml={'auto'}
                      alignSelf={'self-start'}
                      fontWeight={'bold'}
                      color={'brightBlue.600'}
                    >
                      ¥{prices?.networkPrice}/{t('hour')}
                    </Text>
                  </Flex>
                </Flex>
              </PopoverBody>

              {/* Billing rules */}
              <PopoverHeader px={'18px'} py={'12px'} fontWeight={'bold'} fontSize={'md'}>
                {t('Billing rules')}
              </PopoverHeader>
              <PopoverArrow />
              <PopoverBody>
                <Flex flexDirection={'column'} gap={'4px'}>
                  <Flex {...priceItemStyle} fontSize={'base'} justifyContent={'space-between'}>
                    <Text w={'50px'} fontSize={'base'}>
                      {t('Storage')}
                    </Text>
                    <Text fontSize={'sm'}>
                      {t('Reference fee disk tips', { price: instanceType?.diskPerG })}
                    </Text>
                  </Flex>
                  <Flex {...priceItemStyle} justifyContent={'space-between'}>
                    <Text
                      flexShrink={0}
                      w={'50px'}
                      alignSelf={'self-start'}
                      fontSize={'base'}
                      width={'50px'}
                    >
                      {t('BandWidth')}
                    </Text>
                    <Text fontSize={'sm'} wordBreak={'break-all'}>
                      {t('Reference fee network tips', {
                        price1: instanceType?.networkSpeedUnderSpeedBoundaryPerHour,
                        price2: instanceType?.networkSpeedAboveSpeedBoundaryPerHour
                      })}
                    </Text>
                  </Flex>
                </Flex>
              </PopoverBody>
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
