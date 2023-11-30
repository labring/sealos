import { defineStyleConfig, extendTheme } from '@chakra-ui/react';

const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: '6px'
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
    },
    black: {}
  }
});

const Input = defineStyleConfig({
  baseStyle: {},
  variants: {
    samll: {
      field: {
        color: '#24282C',
        width: '320px',
        height: '32px',
        bg: 'myWhite.300',
        border: '1px solid',
        borderRadius: '2px',
        borderColor: 'myGray.200',
        _focus: {
          borderColor: 'myBlue.600',
          boxShadow: '0px 0px 4px #A8DBFF',
          bg: 'white'
        },
        _disabled: {
          color: 'myGray.400',
          bg: 'myWhite.300'
        },
        fontSize: '12px',
        fontWeight: 400
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'samll'
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

export const theme = extendTheme({
  initialColorMode: 'light',
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
    },
    myBlack: {
      900: '#24282C'
    }
  },
  components: {
    Button,
    Input,
    Select
  }
});
