import { Img, ImgProps } from '@chakra-ui/react';
import storageIcon from '@/assert/storage.svg';
export function StorageIcon(props: ImgProps) {
  return <Img src={storageIcon.src} boxSize={'16px'} {...props} />;
}
