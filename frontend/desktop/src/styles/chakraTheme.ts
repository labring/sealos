import { defineStyleConfig, extendTheme } from '@chakra-ui/react';
import { theme as originTheme } from '@sealos/ui';

const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: '4px'
  },
  sizes: {
    sm: {},
    md: {},
    primary: {
      width: '215px',
      height: '36px'
    }
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
    }
  }
});

const Input = defineStyleConfig({});

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
export const Modal = defineStyleConfig({
  baseStyle: {
    header: {
      fontWeight: 600,
      fontSize: '20px'
    }
  }
});
export const theme = extendTheme(originTheme, {
  initialColorMode: 'light', // 'dark | 'light'
  useSystemColorMode: false,
  components: {
    Button,
    Input,
    Select,
    Modal
  },
  breakpoints: {
    base: '0px',
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1440px'
  },
  semanticTokens: {
    colors: {
      background: {
        default: '#FFFFFF',
        _dark: '#09090B'
      },
      foreground: {
        default: '#09090B',
        _dark: '#FAFAFA'
      },
      card: {
        default: '#FFFFFF',
        _dark: '#09090B'
      },
      'card-foreground': {
        default: '#09090B',
        _dark: '#FAFAFA'
      },
      primary: {
        default: '#18181B',
        _dark: '#FAFAFA'
      },
      'primary-foreground': {
        default: '#FAFAFA',
        _dark: '#18181B'
      },
      secondary: {
        default: '#F4F4F5',
        _dark: '#27272A'
      },
      'secondary-foreground': {
        default: '#18181B',
        _dark: '#FAFAFA'
      },
      muted: {
        default: '#F4F4F5',
        _dark: '#27272A'
      },
      'muted-foreground': {
        default: '#71717A',
        _dark: '#A1A1AA'
      },
      border: {
        default: '#E4E4E7',
        _dark: '#27272A'
      },
      input: {
        default: '#E4E4E7',
        _dark: '#27272A'
      }
    }
  }
});
