import sealosCoin from '@/assert/sealos_coin.png';
import { IconProps, Img, Text, TextProps } from '@chakra-ui/react';
export default function CurrencySymbol({
  type = 'shellCoin',
  ...props
}: {
  type?: 'shellCoin' | 'cny' | 'usd';
} & IconProps &
  TextProps) {
  return type === 'shellCoin' ? (
    <Img src={sealosCoin.src} boxSize={'16px'} maxW={'unset'} {...props}></Img>
  ) : type === 'cny' ? (
    <Text {...props} boxSize={'auto'}>
      ￥
    </Text>
  ) : (
    <Text {...props} boxSize={'auto'}>
      $
    </Text>
  );
}
