import { inputAnatomy, switchAnatomy, tagAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers, defineStyleConfig, extendTheme } from '@chakra-ui/react';
import { ThemeColors } from './colors';

const TagHelper = createMultiStyleConfigHelpers(tagAnatomy.keys);
const InputHelper = createMultiStyleConfigHelpers(inputAnatomy.keys);
const SwitchHelper = createMultiStyleConfigHelpers(switchAnatomy.keys);

const Button = defineStyleConfig({
  sizes: {
    primary: {
      width: '215px'
    },
    md: {
      width: '100px',
      height: '36px'
    },
    lg: {
      width: '180px',
      height: '36px'
    }
  },
  variants: {
    primary: {
      bg: '#111824',
      _hover: {
        bg: '#111824',
        _disabled: {
          bg: '#111824'
        }
      },
      color: '#FEFEFE'
    },
    black: {
      bg: ThemeColors.gray[900],
      color: '#FFF',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      _hover: {
        opacity: '0.9'
      }
    },
    square: {
      borderRadius: '8px',
      bg: '#F0F1F6',
      minW: '30px',
      width: '30px',
      height: '30px',
      p: '0px',
      _hover: {
        svg: {
          fill: ThemeColors.brightBlue[500]
        }
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'black'
  }
});

const Input = InputHelper.defineMultiStyleConfig({
  variants: {
    outline: {
      field: {
        width: '300px',
        fontSize: '12px',
        fontWeight: 400,
        height: '32px',
        borderRadius: 'lg',
        border: '1px solid #E8EBF0',
        bg: ThemeColors.gray[50],
        _focusVisible: {
          borderColor: ThemeColors.brightBlue[500],
          boxShadow: ThemeColors.boxShadowBlue,
          bg: '#FFF',
          color: '#111824'
        },
        _disabled: {
          color: '#8A95A7',
          bg: '#FBFBFC',
          _hover: {}
        },
        _hover: {
          borderColor: ThemeColors.brightBlue[300],
          bg: ThemeColors.gray[50]
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

const Select = defineStyleConfig({
  variants: {
    filled: {
      field: {
        backgroundColor: '#F4F6F8'
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'filled'
  }
});

const Tag = TagHelper.defineMultiStyleConfig({
  baseStyle: {
    container: {
      borderRadius: '8px',
      backgroundColor: 'gray.150'
    },
    label: {
      fontWeight: 500,
      fontSize: '12px'
    }
  }
});

const Switch = SwitchHelper.defineMultiStyleConfig({
  baseStyle: {
    track: {
      bg: 'gray.100',
      _checked: {
        bg: 'gray.700'
      }
    }
  }
});

export const theme = extendTheme({
  initialColorMode: 'light',
  colors: ThemeColors,
  styles: {
    global: {
      'html, body': {
        fontFamily: 'PingFang SC'
      }
    }
  },
  components: {
    Button,
    Input,
    Select,
    Tag,
    Switch
  }
});
