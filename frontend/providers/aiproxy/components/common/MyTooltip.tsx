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
      borderRadius="var(--md, 8px)"
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
      boxShadow="0px 2px 4px 0px rgba(161, 167, 179, 0.25), 0px 0px 1px 0px rgba(121, 141, 159, 0.25)"
      border="1px solid #FFF"
      cssVarsStyles={{
        '--tooltip-bg': 'white',
        '--popper-arrow-bg': 'white',
        '--popper-arrow-shadow-color': 'rgba(161, 167, 179, 0.25)',
        '--md': '8px'
      }}
      sx={{
        '& [data-popper-arrow]': {
          '--popper-arrow-shadow-color': 'rgba(161, 167, 179, 0.25)',
          '&::before': {
            boxShadow:
              '0px 2px 4px 0px rgba(161, 167, 179, 0.25), 0px 0px 1px 0px rgba(121, 141, 159, 0.25)',
            border: '1px solid #FFF',
            borderRadius: 'var(--md, 8px)'
          }
        }
      }}
      {...tooltipProps}>
      {children}
    </Tooltip>
  )
}
