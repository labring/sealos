import { Img, ImgProps } from '@chakra-ui/react';
import network from '@/assert/network.svg';
export function NetworkIcon(props: ImgProps) {
  return <Img width="16" height="16" src={network.src} {...props} />;
}
