import React from 'react';
import { Tooltip, TooltipProps } from '@chakra-ui/react';

type ArrowDirection = 'top' | 'bottom' | 'left' | 'right';

interface CustomTooltipProps extends Omit<TooltipProps, 'children' | 'placement'> {
  placement: ArrowDirection;
  children: React.ReactNode;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ placement = 'top', children, ...props }) => {
  const getArrowStyles = (placement: ArrowDirection) => {
    switch (placement) {
      case 'top':
        return {
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderColor: 'rgba(239, 239, 242, 0.7) transparent transparent transparent'
        };
      case 'bottom':
        return {
          top: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderColor: 'transparent transparent rgba(239, 239, 242, 0.7) transparent'
        };
      case 'left':
        return {
          right: '-16px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderColor: 'transparent transparent transparent rgba(239, 239, 242, 0.7)'
        };
      case 'right':
        return {
          left: '-16px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderColor: 'transparent rgba(239, 239, 242, 0.7) transparent transparent'
        };
    }
  };

  return (
    <Tooltip
      bg={'rgba(239, 239, 242, 0.7)'}
      px={'10px'}
      py={'8px'}
      borderRadius={'6px'}
      fontSize={'12px'}
      fontWeight={500}
      color={'grayModern.900'}
      hasArrow
      placement={placement}
      backdropFilter="blur(80px) saturate(150%)"
      sx={{
        '&::before': {
          content: '""',
          position: 'absolute',
          borderWidth: '8px',
          borderStyle: 'solid',
          ...getArrowStyles(placement)
        },
        '& .chakra-tooltip__arrow': {
          display: 'none'
        },
        '& .chakra-tooltip__arrow-bg': {
          display: 'none'
        },
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
};

export default CustomTooltip;
