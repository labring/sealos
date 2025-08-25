import { Icon, IconProps } from '@chakra-ui/react';

export default function SuccessIcon(props: IconProps) {
  return (
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="#039855"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.1265 3.52864C14.3869 3.78899 14.3869 4.2111 14.1265 4.47145L6.79318 11.8048C6.53283 12.0651 6.11072 12.0651 5.85037 11.8048L2.51704 8.47145C2.25669 8.2111 2.25669 7.78899 2.51704 7.52864C2.77739 7.26829 3.1995 7.26829 3.45985 7.52864L6.32178 10.3906L13.1837 3.52864C13.4441 3.26829 13.8662 3.26829 14.1265 3.52864Z"
      />
    </Icon>
  );
}
