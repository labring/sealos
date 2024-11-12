import { Icon, IconProps } from '@chakra-ui/react'

export function ToLeftIcon(props: IconProps) {
  return (
    <Icon
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="12px"
      height="12px"
      viewBox="0 0 12 12"
      fill="none">
      <path
        d="M5.414 5.99999L7.889 8.47499L7.182 9.18199L4 5.99999L7.182 2.81799L7.889 3.52499L5.414 5.99999Z"
        fill="#111824"
      />
    </Icon>
  )
}

export function RightFirstIcon(props: IconProps) {
  return (
    <Icon
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="12px"
      height="12px"
      viewBox="0 0 12 12"
      fill="none">
      <path
        d="M2.79492 3.705L5.08992 6L2.79492 8.295L3.49992 9L6.49992 6L3.49992 3L2.79492 3.705ZM7.99992 3H8.99992V9H7.99992V3Z"
        fill="#111824"
      />
    </Icon>
  )
}
