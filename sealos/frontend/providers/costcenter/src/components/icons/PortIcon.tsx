import { Img, ImgProps } from '@chakra-ui/react';
import icon from '@/assert/port.svg';
export function PortIcon(props: ImgProps) {
  return <Img src={icon.src} boxSize={'16px'} {...props} />;
}
