import { Icon, IconProps } from '@chakra-ui/react';

export default function WarnIcon(props: IconProps) {
  return (
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="24px"
      height="24px"
      viewBox="0 0 24 24"
      fill="#FB7C3C"
      {...props}
    >
      <path d="M1 21L12 2L23 21H1ZM4.45 19H19.55L12 6L4.45 19ZM12 18C12.2833 18 12.521 17.904 12.713 17.712C12.9043 17.5207 13 17.2833 13 17C13 16.7167 12.9043 16.4793 12.713 16.288C12.521 16.096 12.2833 16 12 16C11.7167 16 11.4793 16.096 11.288 16.288C11.096 16.4793 11 16.7167 11 17C11 17.2833 11.096 17.5207 11.288 17.712C11.4793 17.904 11.7167 18 12 18ZM11 15H13V10H11V15Z" />
    </Icon>
  );
}
