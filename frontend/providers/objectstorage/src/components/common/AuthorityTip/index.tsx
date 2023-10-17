import { Authority } from '@/consts';
import { BackgroundProps, ColorProps, Flex } from '@chakra-ui/react';

export default function AuthorityTips({ authority }: { authority: Authority }) {
  const style: Record<Authority, ColorProps & BackgroundProps> = {
    [Authority.readonly]: {
      color: 'adora.600',
      bgColor: 'rgba(129, 114, 216, 0.05)'
    },
    [Authority.private]: {
      color: 'brightBlue.700',
      bgColor: 'blue.100'
    },
    [Authority.readwrite]: {
      color: 'primary.600',
      bgColor: 'primary.100'
    }
  };
  return (
    <Flex
      px="4px"
      py="3px"
      borderRadius={'4px'}
      {...style[authority]}
      textTransform={'capitalize'}
      fontSize={'11px'}
    >
      {authority}
    </Flex>
  );
}
