import { Tooltip, TooltipProps } from '@chakra-ui/react'

export const MyTooltip = ({ children, ...tooltipProps }: TooltipProps) => {
  return (
    <Tooltip
      hasArrow
      placement="bottom"
      bg="white"
      color="grayModern.900"
      fontSize="12px"
      padding="8px 12px"
      borderRadius="8px"
      display="flex"
      width="60px"
      height="34px"
      justifyContent="center"
      alignItems="center"
      flexShrink={0}
      fontFamily="PingFang SC"
      fontWeight={400}
      lineHeight="16px"
      letterSpacing="0.048px"
      {...tooltipProps}>
      {children}
    </Tooltip>
  )
}
