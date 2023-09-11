import { Icon } from '@chakra-ui/react';
export default function CancelIcon(props: Parameters<typeof Icon>[0]) {
  return (
    <Icon viewBox="0 0 17 17" fill="none" {...props}>
      <path
        d="M4.64551 11.497L8.14084 8.00168L11.6362 11.497M11.6362 4.50635L8.14017 8.00168L4.64551 4.50635"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
