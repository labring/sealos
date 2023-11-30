import { Box, Flex, Image, Text } from '@chakra-ui/react';

export default function Background() {
  return (
    <>
      <Image alt="bg" src="/images/bg.svg" zIndex={-100} position={'fixed'} w="100vw" h="100vh" />
      <Image
        alt="bg"
        src="/images/bg-bottom.svg"
        zIndex={-98}
        position={'fixed'}
        w="100vw"
        bottom={0}
        left={0}
      />
      <Image
        alt="bg"
        src="/images/moon.svg"
        zIndex={-96}
        position={'fixed'}
        w="100vw"
        top={0}
        left={0}
      />
      <Flex position={'fixed'} top={'40px'} left={'42px'} alignItems={'center'}>
        <Image
          cursor={'pointer'}
          p="2px"
          width="36px"
          height="36px"
          src={'/images/sealos.svg'}
          fallbackSrc="/images/sealos.svg"
          alt="logo"
        />
        <Text ml="6px" mr="12px" fontSize={20} fontWeight={700} color={'#fff'} cursor={'pointer'}>
          Sealos
        </Text>
        <Text fontSize={16} fontWeight={600} color={'#fff'}>
          ｜ License
        </Text>
      </Flex>
    </>
  );
}
