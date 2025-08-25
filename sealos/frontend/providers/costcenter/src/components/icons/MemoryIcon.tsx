import { Icon, IconProps, Img, ImgProps } from '@chakra-ui/react';
import memoryIcon from '@/assert/memory.svg';
export function MemoryIcon(props: ImgProps) {
  return <Img src={memoryIcon.src} width="16" height="16" {...props} />;
}
