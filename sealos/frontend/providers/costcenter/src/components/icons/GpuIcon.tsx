import gpuIcon from '@/assert/gpu.svg';
import { Img, ImgProps } from '@chakra-ui/react';
export default function GpuIcon(props: ImgProps) {
  return <Img src={gpuIcon.src} width="16" height="16" {...props} />;
}
