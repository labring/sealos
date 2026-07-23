import { Authority } from '@/consts';
import { BackgroundProps, ColorProps, Flex } from '@chakra-ui/react';

export default function AuthorityTips({ authority }: { authority: Authority }) {
  const style: Record<Authority, ColorProps & BackgroundProps> = {
    [Authority.readonly]: {
      color: 'adora.600',
      bgColor: 'adora.50'
    },
    [Authority.private]: {
      color: 'brightBlue.600',
      bgColor: 'brightBlue.50'
    },
    [Authority.readwrite]: {
      color: 'teal.700',
      bgColor: 'teal.50'
    }
  };
  return (
    <Flex
      px="8px"
      py="4px"
      borderRadius={'4px'}
      {...style[authority]}
      textTransform={'capitalize'}
      fontSize={'11px'}
    >
      {authority}
    </Flex>
  );
}
