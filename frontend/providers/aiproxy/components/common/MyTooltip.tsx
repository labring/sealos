'use client'

import { Tooltip, TooltipProps } from '@chakra-ui/react'

export const MyTooltip = ({ children, ...tooltipProps }: TooltipProps) => {
  const tooltipStyles = {
    hasArrow: true,
    placement: 'bottom' as const,
    bg: 'white',
    color: 'grayModern.900',
    fontSize: '12px',
    p: '8px 12px',
    borderRadius: '8px',
    display: 'flex',
    w: '60px',
    h: '34px',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    fontFamily: 'PingFang SC',
    fontWeight: 400,
    lineHeight: '16px',
    letterSpacing: '0.048px',
    boxShadow:
      '0px 2px 4px 0px rgba(161, 167, 179, 0.25), 0px 0px 1px 0px rgba(121, 141, 159, 0.25)',
    border: '1px solid #FFF',
    sx: {
      // CSS 变量定义
      '--tooltip-bg': 'white',
      '--popper-arrow-bg': 'white',
      '--popper-arrow-shadow-color': 'rgba(161, 167, 179, 0.25)',
      '--md': '8px',

      // 箭头样式
      '& [data-popper-arrow]': {
        '--popper-arrow-shadow-color': 'rgba(161, 167, 179, 0.25)',
        '&::before': {
          boxShadow:
            '0px 2px 4px 0px rgba(161, 167, 179, 0.25), 0px 0px 1px 0px rgba(121, 141, 159, 0.25)',
          border: '1px solid #FFF',
          borderRadius: 'var(--md)'
        }
      }
    }
  }

  return (
    <Tooltip {...tooltipStyles} {...tooltipProps}>
      {children}
    </Tooltip>
  )
}
