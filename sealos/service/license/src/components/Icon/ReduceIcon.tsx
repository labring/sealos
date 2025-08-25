import { Icon, IconProps } from '@chakra-ui/react';

export const ReduceIcon = (props: IconProps) => {
  return (
    <Icon
      xmlns="http://www.w3.org/2000/svg"
      width="18px"
      height="18px"
      viewBox="0 0 18 18"
      fill="#485264"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.14999 9C3.14999 8.58579 3.48577 8.25 3.89999 8.25H14.1C14.5142 8.25 14.85 8.58579 14.85 9C14.85 9.41421 14.5142 9.75 14.1 9.75H3.89999C3.48577 9.75 3.14999 9.41421 3.14999 9Z"
      />
    </Icon>
  );
};
