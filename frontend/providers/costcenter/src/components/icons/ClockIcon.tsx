import clockSvg from '@/assert/clock.svg';
import { Img, ImgProps } from '@chakra-ui/react';
export function ClockIcon(props: ImgProps) {
  return <Img width="16" height="16" src={clockSvg.src} {...props} />;
}
