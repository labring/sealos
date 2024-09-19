import nvidiaImg from '@/assert/nvidia.svg';
import { Img, ImgProps } from '@chakra-ui/react';
export default function NvidiaIcon(props: ImgProps) {
  return <Img src={nvidiaImg.src} w="16px" h="16px" mr="8px" />;
}
