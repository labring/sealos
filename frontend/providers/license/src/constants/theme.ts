import {
  ComponentStyleConfig,
  createMultiStyleConfigHelpers,
  defineStyle,
  defineStyleConfig,
  extendTheme
} from '@chakra-ui/react';
// @ts-ignore
import {
  selectAnatomy,
  switchAnatomy,
  numberInputAnatomy,
  checkboxAnatomy
} from '@chakra-ui/anatomy';
const { definePartsStyle: selectPart, defineMultiStyleConfig: selectMultiStyle } =
  createMultiStyleConfigHelpers(selectAnatomy.keys);
const { definePartsStyle: switchPart, defineMultiStyleConfig: switchMultiStyle } =
  createMultiStyleConfigHelpers(switchAnatomy.keys);
const { definePartsStyle: numInputPart, defineMultiStyleConfig: numInputMultiStyle } =
  createMultiStyleConfigHelpers(numberInputAnatomy.keys);
const { definePartsStyle: checkboxPart, defineMultiStyleConfig: checkboxStyle } =
  createMultiStyleConfigHelpers(checkboxAnatomy.keys);

import { theme as sealosTheme } from '@sealos/ui';

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
      bg: 'myGray.900',
      color: 'white',
      _hover: {
        bg: 'myGray.700 !important'
      }
    },
    base: {
      bg: 'myWhite.600',
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
        bg: 'myWhite.300',
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
const NumberInput = numInputMultiStyle({
  variants: {
    outline: numInputPart({
      field: {
        bg: 'myWhite.300',
        border: '1px solid',
        borderRadius: 'base',
        borderColor: 'myGray.200',
        _focus: {
          borderColor: 'myBlue.600 !important',
          boxShadow: '0px 0px 4px #A8DBFF !important',
          bg: 'transparent'
        },
        _disabled: {
          color: 'myGray.400 !important',
          bg: 'myWhite.300 !important'
        }
      },
      stepper: {
        bg: 'transparent',
        border: 'none',
        color: 'myGray.600',
        _active: {
          color: 'myBlue.600'
        }
      }
    })
  },
  defaultProps: {
    variant: 'outline'
  }
});

const Textarea: ComponentStyleConfig = {
  variants: {
    outline: {
      bg: 'myWhite.300',
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
  }),
  variants: {
    deepLight: {
      track: {
        bg: 'myGray.200',
        _checked: {
          bg: 'myGray.700'
        }
      }
    }
  }
});

const Tooltip = defineStyleConfig({
  baseStyle: {
    p: 2,
    bg: 'white',
    color: 'blackAlpha.800',
    borderRadius: '8px',
    boxShadow: '1px 1px 7px rgba(0,0,0,0.2)'
  }
});

const Checkbox = checkboxStyle({
  baseStyle: checkboxPart({
    control: defineStyle({
      _checked: {
        bg: 'black',
        borderColor: 'black',
        _hover: {
          bg: 'black !important',
          borderColor: 'black !important'
        }
      }
    })
  })
});

export const theme = extendTheme(sealosTheme, {
  styles: {
    global: {
      'html, body': {
        color: 'myGray.900',
        fontSize: 'md',
        height: '100%',
        fontWeight: 400,
        bg: '#F4F4F7'
      }
    }
  }
});
