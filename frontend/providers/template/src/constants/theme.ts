import {
  ComponentStyleConfig,
  createMultiStyleConfigHelpers,
  defineStyle,
  defineStyleConfig,
  extendTheme
} from '@chakra-ui/react';
import { theme as sealosTheme } from '@sealos/ui';
// @ts-ignore
import { selectAnatomy, switchAnatomy } from '@chakra-ui/anatomy';
const { definePartsStyle: selectPart, defineMultiStyleConfig: selectMultiStyle } =
  createMultiStyleConfigHelpers(selectAnatomy.keys);
const { definePartsStyle: switchPart, defineMultiStyleConfig: switchMultiStyle } =
  createMultiStyleConfigHelpers(switchAnatomy.keys);

const Button = defineStyleConfig({
  baseStyle: {
    _active: {
      transform: 'scale(0.98)'
    }
  },
  sizes: {
    xs: {
      fontSize: 'xs',
      px: 3,
      py: 0,
      fontWeight: 'normal',
      height: '22px',
      borderRadius: '2px'
    },
    sm: {
      fontSize: 'sm',
      px: 3,
      py: 0,
      fontWeight: 'normal',
      height: '26px',
      borderRadius: '2px'
    },
    md: {
      fontSize: 'md',
      px: 6,
      py: 0,
      height: '34px',
      fontWeight: 'normal',
      borderRadius: '4px'
    },
    lg: {
      fontSize: 'lg',
      px: 8,
      py: 0,
      height: '42px',
      fontWeight: 'normal',
      borderRadius: '8px'
    }
  },
  variants: {
    primary: {
      backgroundColor: 'myGray.900',
      color: 'white',
      _hover: {
        backgroundColor: 'myGray.700'
      }
    },
    base: {
      backgroundColor: 'myWhite.600',
      color: 'myGray.900',
      border: '1px solid',
      borderColor: 'myGray.100',
      _hover: {
        color: 'hover.blue'
      }
    }
  },
  defaultProps: {
    size: 'md',
    // @ts-ignore
    variant: 'outline'
  }
});

const Input: ComponentStyleConfig = {
  baseStyle: {},
  variants: {
    outline: {
      field: {
        backgroundColor: 'transparent',
        border: '1px solid',
        borderRadius: 'base',
        borderColor: 'myGray.200',
        _focus: {
          borderColor: 'myBlue.600',
          boxShadow: '0px 0px 4px #A8DBFF',
          bg: 'white'
        },
        _disabled: {
          color: 'myGray.400',
          bg: 'myWhite.300'
        }
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
};

const Textarea: ComponentStyleConfig = {
  variants: {
    outline: {
      border: '1px solid',
      borderRadius: 'base',
      borderColor: 'myGray.200',
      _focus: {
        borderColor: 'myBlue.600',
        boxShadow: '0px 0px 4px #A8DBFF'
      }
    }
  },

  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
};

const Select = selectMultiStyle({
  variants: {
    outline: selectPart({
      field: {
        borderColor: 'myGray.100',

        _focusWithin: {
          boxShadow: '0px 0px 4px #A8DBFF',
          borderColor: 'myBlue.600'
        }
      }
    })
  }
});

const Switch = switchMultiStyle({
  baseStyle: switchPart({
    track: {
      bg: 'myGray.100',
      _checked: {
        bg: 'myGray.700'
      }
    }
  })
});

const Tooltip = defineStyleConfig({
  baseStyle: {
    p: 2,
    backgroundColor: 'white',
    color: 'blackAlpha.800',
    borderRadius: 'lg',
    boxShadow: '1px 1px 7px rgba(0,0,0,0.2)'
  }
});

export const theme = extendTheme(sealosTheme, {
  styles: {
    global: {
      'html, body': {
        color: 'myGray.900',
        fontSize: 'md',
        height: '100%',
        overflow: 'overlay',
        fontWeight: 400
      }
    }
  },
  breakpoints: {
    base: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  fontSizes: {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '16px',
    '2xl': '18px',
    '3xl': '20px'
  },
  colors: {
    divider: {
      100: '#E5E7E9'
    },
    hover: {
      blue: '#0884DD',
      iconBlue: '#219BF4'
    },
    myGray: {
      100: '#EFF0F1',
      200: '#DEE0E2',
      300: '#BDC1C5',
      400: '#9CA2A8',
      500: '#7B838B',
      600: '#5A646E',
      700: '#485058',
      800: '#363C42',
      900: '#24282C',
      1000: '#121416'
    },
    myWhite: {
      100: '#FEFEFE',
      200: '#FDFDFE',
      300: '#FBFBFC',
      400: '#F8FAFB',
      500: '#F6F8F9',
      600: '#F4F6F8',
      700: '#C3C5C6',
      800: '#929495',
      900: '#626263',
      1000: '#313132'
    },
    myBlue: {
      100: '#EBF7FD',
      200: '#D7EFFC',
      300: '#AFDEF9',
      400: '#86CEF5',
      500: '#5EBDF2',
      600: '#36ADEF',
      700: '#2B8ABF',
      800: '#20688F',
      900: '#164560',
      1000: '#0B2330'
    },
    myRed: {
      100: '#FFEBED',
      200: '#FFD6DB',
      300: '#FFADB7',
      400: '#FF8492',
      500: '#FF5B6E',
      600: '#FF324A',
      700: '#CC283B',
      800: '#991E2C',
      900: '#66141E',
      1000: '#330A0F'
    }
  },
  borders: {
    sm: '1px solid #EFF0F1',
    base: '1px solid #DEE0E2',
    md: '1px solid #BDC1C5'
  },
  radii: {
    xs: '1px',
    sm: '2px',
    base: '2px',
    md: '4px',
    lg: '6px'
  },
  fontWeights: {
    bold: 500
  },
  components: {
    Button,
    Input,
    Tooltip,
    Select,
    Switch,
    Textarea
  }
});
