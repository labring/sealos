import { inputAnatomy, modalAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers, extendTheme } from '@chakra-ui/react';
import { theme as sealosTheme } from '@sealos/ui';
import { defineStyleConfig } from '@chakra-ui/react';
import { colors } from '@sealos/ui/src/theme/colors';

const customColors = {
  base: '#02A7F0',
  success: '#11B77B',
  warn: '#FF9500',
  error: '#D9001B'
};

export const Button = defineStyleConfig({
  sizes: {
    xs: {},
    sm: {
      fontSize: '12px'
    },
    md: {
      fontSize: '14px'
    },
    lg: {}
  },
  variants: {
    primary: {
      bg: '#3E3B3B',
      _hover: {
        bg: '#3E3B3B',
        _disabled: {
          bg: '#3E3B3B'
        }
      },
      color: '#FEFEFE'
    },
    // >>>old
    secondary: {
      border: '1px solid',
      borderColor: 'grayModern.200',
      background: 'white_.500',
      color: 'grayModern.900',
      _hover: {
        borderColor: 'blue.600'
      }
    },
    warn: {
      bgColor: 'error.500',
      color: 'white_.100'
    },
    'white-bg-icon': {
      _hover: {
        bgColor: '#9699B41A'
      },
      minW: 'unset',
      h: 'unset',
      p: '4px'
    },
    solid: {
      bg: customColors.base,
      color: '#FFF',
      borderRadius: 'md',
      fontWeight: 500,
      _hover: {
        opacity: '0.9',
        bg: customColors.base
      },
      _active: {
        bg: ''
      }
    },
    square: {
      borderRadius: '6px',
      minW: '30px',
      width: '30px',
      height: '30px',
      p: '0px',
      _hover: {
        color: 'brightBlue.600',
        bg: 'rgba(17, 24, 36, 0.05)'
      }
    },
    outline: {
      bg: '#FFF',
      borderRadius: 'md',
      fontWeight: 500,
      border: '1px solid',
      borderColor: 'grayModern.250',
      color: 'grayModern.600',
      minW: '16px',
      minH: '16px',
      _hover: {
        opacity: '0.9',
        bg: 'rgba(33, 155, 244, 0.05)',
        color: customColors.base,
        borderColor: customColors.base
      },
      _active: {
        bg: ''
      }
    }
  },
  defaultProps: {
    variant: 'solid',
    size: 'md'
  }
});

const InputHelper = createMultiStyleConfigHelpers(inputAnatomy.keys);

export const Input = InputHelper.defineMultiStyleConfig({
  variants: {
    outline: {
      field: {
        width: '300px',
        fontSize: '12px',
        fontWeight: 400,
        height: '32px',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: customColors.base,
        bg: 'white',
        _focusVisible: {
          borderColor: customColors.base,
          boxShadow: colors.boxShadowBlue,
          bg: '#FFF',
          color: '#111824'
        },
        _disabled: {
          color: '#8A95A7',
          bg: '#FBFBFC',
          _hover: {}
        },
        _hover: {
          borderColor: customColors.base,
          bg: 'white'
        },
        _invalid: {
          bg: '#FFF',
          borderColor: '#D92D20',
          boxShadow: '0px 0px 0px 2.4px rgba(217, 45, 32, 0.15)'
        },
        _placeholder: {
          color: '#667085',
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: '16px'
        }
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
});

const ModalHelper = createMultiStyleConfigHelpers(modalAnatomy.keys);

export const Modal = ModalHelper.defineMultiStyleConfig({
  baseStyle: {
    header: {
      bg: customColors.base,
      borderTopRadius: '8px',
      borderBottom: '1px solid #F4F4F7',
      fontSize: '16px',
      color: 'white',
      fontWeight: '500',
      py: '11.5px',
      lineHeight: '24px'
    },
    closeButton: {
      fill: 'white',
      color: 'white',
      svg: {
        width: '12px',
        height: '12px'
      }
    },
    dialog: {
      borderRadius: '10px'
    },
    body: {
      px: '36px',
      py: '24px'
    },
    footer: {
      px: '36px',
      pb: '24px',
      pt: '0px'
    }
  }
});

export const theme = extendTheme(sealosTheme, {
  styles: {
    global: {
      'html, body': {
        fontSize: 'md',
        height: '100%',
        overflow: 'overlay',
        fontWeight: 400,
        minWidth: '1024px'
      }
    }
  },
  colors,
  components: {
    Button,
    Input,
    Modal
  }
});
