import nodeSvg from '@/assert/node.svg';
import { Img, ImgProps } from '@chakra-ui/react';
export function NodeIcon(props: ImgProps) {
  return <Img width="16" height="16" src={nodeSvg.src} {...props} />;
}
