import { Icon, IconProps } from '@chakra-ui/react';

export const CheckIcon = (props: IconProps) => {
  return (
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="20px"
      height="20px"
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <path
        d="M16.6667 5L7.50004 14.1667L3.33337 10"
        stroke={'#36ADEF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
};
