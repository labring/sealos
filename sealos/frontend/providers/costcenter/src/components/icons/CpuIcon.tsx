import { Icon, IconProps, Img, ImgProps } from '@chakra-ui/react';
import cpuIcon from '@/assert/cpu.svg';
export default function CpuIcon(props: ImgProps) {
  return <Img src={cpuIcon.src} width="16" height="16" {...props} />;
}
