import { Img } from '@chakra-ui/react';

export const Background = () => {
  return (
    <Img
      src="/images/background.png"
      position={'fixed'}
      w={'100vw'}
      h={'100vh'}
      top={0}
      bottom={0}
      right={0}
      left={0}
    />
  );
};
