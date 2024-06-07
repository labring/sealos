import { Flex, Icon, Text } from '@chakra-ui/react';
import { blurBackgroundStyles } from './index';

export default function Assistant() {
  return (
    <Flex
      {...blurBackgroundStyles}
      height={{ base: '32px', sm: '48px' }}
      px={{ base: '8px', sm: '14px' }}
      alignItems={'center'}
      color={'white'}
      fontSize={'base'}
      fontWeight={'bold'}
      gap={'8px'}
    >
      <Icon
        width="29px"
        height="28px"
        viewBox="0 0 29 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="14.5985" cy="14" r="14" fill="white" fillOpacity="0.2" />
        <circle cx="14.5985" cy="14" r="12" fill="white" fillOpacity="0.9" />
        <text
          x="14.5985"
          y="16"
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="12"
          fontFamily="Arial, sans-serif"
          fill="black"
        >
          🤖
        </text>
      </Icon>
      <Text display={{ base: 'none', md: 'block' }}>Sealos 小助理</Text>
    </Flex>
  );
}
