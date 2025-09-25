import { defineStyleConfig, extendTheme } from '@chakra-ui/react';
import { theme as originTheme } from '@sealos/ui';
const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: '4px'
  },
  sizes: {
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
const Tabs = defineStyleConfig({
  variants: {
    primary: {
      tablist: {
        // borderColor: '#EFF0F1',
        alignItems: 'center',
        border: 'unset',
        gap: '12px',
        fontWeight: '500'
      },
      tab: {
        fontWeight: '500',
        fontSize: '16px',
        px: '4px',
        py: '8px',
        borderBottom: '1.5px solid',
        borderColor: 'transparent',
        color: 'grayModern.500',
        _selected: { color: 'grayModern.900', borderColor: 'grayModern.900' },
        _active: {
          color: 'unset'
        }
      },
      tabpanels: {
        mt: '12px'
      }
    }
  }
});

const Input = defineStyleConfig({});

const Select = defineStyleConfig({
  variants: {
    outline: {
      field: {
        backgroundColor: '#F4F6F8',
        borderRadius: '2px',
        border: '1px solid #DEE0E2'
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
});
const Heading = defineStyleConfig({
  sizes: {
    sm: {
      fontsize: '14px',
      color: '#5A646E',
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: '140%'
    },
    lg: {
      fontStyle: 'normal',
      fontWeight: '500',
      fontSize: '20px',
      lineHeight: '150%',
      color: '#24282C'
    }
  }
});
const Card = defineStyleConfig({
  variants: {
    filled: {
      container: {
        height: '146px',
        width: '145px',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDFDFE'
      },
      body: {
        display: 'flex'
      }
    }
  }
});
export const theme = extendTheme(originTheme, {
  components: {
    Select,
    Heading,
    Card,
    Tabs
  },
  breakpoints: { base: '0em', sm: '30em', md: '48em', lg: '62em', xl: '80em', '2xl': '96em' },
  fonts: {
    '*': `'PingFang SC'`,
    div: `'PingFang SC'`,
    button: `'PingFang SC'`
  },
  colors: {
    purple: {
      100: '#F7E7FF',
      600: '#9E53C1'
    }
  }
});
